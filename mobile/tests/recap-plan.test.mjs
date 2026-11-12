// Run: npm test. Qrewing recap: trigger steps, stored shape, per-user merge, timeout.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EMPTY_MARK,
  mergeMyPart,
  parseMark,
  parseSavedRecap,
  recapKey,
  recapStep,
  stepCall,
  withTimeout,
} from '../src/features/recap/recap-plan.ts';

const MIN = 60_000;

test('recapKey uses the spec key', () => {
  assert.equal(recapKey('r1'), 'qrewing.recap.v1.r1');
});

test('recapStep: first at 60 minutes, refresh in the last 10, each once, nothing after the end', () => {
  assert.equal(recapStep(61 * MIN, EMPTY_MARK), null);
  assert.equal(recapStep(60 * MIN, EMPTY_MARK), 'first');
  assert.equal(recapStep(30 * MIN, { ...EMPTY_MARK, first: true }), null);
  assert.equal(recapStep(10 * MIN, { ...EMPTY_MARK, first: true }), 'refresh');
  assert.equal(recapStep(5 * MIN, { ...EMPTY_MARK, first: true, refresh: true }), null);
  // App first opened in the last 10 minutes: one 'late' call, never first then refresh.
  assert.equal(recapStep(5 * MIN, EMPTY_MARK), 'late');
  assert.equal(recapStep(10 * MIN, EMPTY_MARK), 'late');
  assert.equal(recapStep(0, EMPTY_MARK), null);
  assert.equal(recapStep(-MIN, EMPTY_MARK), null);
  assert.equal(recapStep(Number.NaN, EMPTY_MARK), null);
});

test('stepCall: late is one refresh call that marks first and refresh, so the next tick sends nothing', () => {
  assert.deepEqual(stepCall('first'), { mark: { first: true }, refresh: false });
  assert.deepEqual(stepCall('refresh'), { mark: { refresh: true }, refresh: true });
  const late = stepCall('late');
  assert.deepEqual(late, { mark: { first: true, refresh: true }, refresh: true });
  assert.equal(recapStep(4 * MIN, { ...EMPTY_MARK, ...late.mark }), null);
});

test('parseSavedRecap round-trips and rejects malformed data', () => {
  const saved = {
    server: { title: 'T', summary: 'S', highlights: ['a', 'b'], generatedAt: '2026-11-12T10:00:00Z' },
    me: { messages: 3, mediaShared: 0, photosOfMe: null, arrivedAt: '2026-11-12T09:00:00Z', pace: null },
    savedAt: '2026-11-12T10:01:00Z',
  };
  assert.deepEqual(parseSavedRecap(JSON.stringify(saved)), saved);
  assert.equal(parseSavedRecap(null), null);
  assert.equal(parseSavedRecap('{'), null);
  assert.equal(parseSavedRecap(JSON.stringify({ ...saved, server: { ...saved.server, highlights: [1] } })), null);
  assert.equal(parseSavedRecap(JSON.stringify({ ...saved, savedAt: 5 })), null);
  const noMe = parseSavedRecap(JSON.stringify({ server: saved.server, savedAt: saved.savedAt }));
  assert.deepEqual(noMe.me, { messages: null, mediaShared: null, photosOfMe: null, arrivedAt: null, pace: null });
});

test('parseMark needs ai true', () => {
  assert.deepEqual(parseMark('{"ai":true,"first":true}'), { ai: true, first: true, refresh: false });
  assert.equal(parseMark('{"first":true}'), null);
  assert.equal(parseMark('x'), null);
});

test('mergeMyPart keeps earlier counts that grace can no longer read', () => {
  const prev = { messages: 4, mediaShared: 1, photosOfMe: 2, arrivedAt: 'a', pace: null };
  const next = { messages: null, mediaShared: 2, photosOfMe: null, arrivedAt: null, pace: 'p' };
  assert.deepEqual(mergeMyPart(prev, next), { messages: 4, mediaShared: 2, photosOfMe: 2, arrivedAt: 'a', pace: 'p' });
  assert.deepEqual(mergeMyPart(null, next), next);
});

test('withTimeout resolves the value, the fallback on timeout, and the fallback on rejection', async () => {
  assert.equal(await withTimeout(Promise.resolve(1), 1000, 'late'), 1);
  assert.equal(await withTimeout(new Promise(() => {}), 5, 'late'), 'late');
  assert.equal(await withTimeout(Promise.reject(new Error('x')), 1000, 'late'), 'late');
});
