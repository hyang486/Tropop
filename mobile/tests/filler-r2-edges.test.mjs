// Run: npm test. Filler (round 2): pure helpers in developer-event files that had no direct test.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ASK_KEY_PREFIX, ASK_LIMITS, askKey, requestHistory, requestMe, THREAD_MATCH_MS } from '../src/features/event/ask-plan.ts';
import { ANSWER_LIMITS, QUESTION_KINDS, answerLimit, ordered } from '../src/features/event/entry-questions.ts';
import { REMINDER_CARD_KEY_PREFIX, reminderCardKey } from '../src/features/event/reminder-card-plan.ts';
import { EMERGENCY_FOLD_AT, emergenciesFolded } from '../src/lib/emergency-plan.ts';

const turn = (i, q = `q${i}`, a = `a${i}`) => ({ q, a, at: i, cardId: `c${i}` });

test('Ask limits and keys', () => {
  assert.deepEqual({ ...ASK_LIMITS }, { question: 300, keep: 30, send: 4 });
  assert.equal(ASK_KEY_PREFIX, 'qrewing.ask.v1.');
  assert.equal(askKey('r1'), 'qrewing.ask.v1.r1');
  assert.equal(THREAD_MATCH_MS, 120_000);
});

test('requestHistory: last 4 turns, only q/a, each side capped at 300 characters (by code point)', () => {
  assert.deepEqual(requestHistory([]), []);
  const six = [1, 2, 3, 4, 5, 6].map((i) => turn(i));
  assert.deepEqual(requestHistory(six), [3, 4, 5, 6].map((i) => ({ q: `q${i}`, a: `a${i}` })));
  const long = 'x'.repeat(301);
  const emoji = '😀'.repeat(301); // 602 UTF-16 units, 301 code points
  const [r] = requestHistory([turn(1, long, emoji)]);
  assert.equal(r.q.length, 300);
  assert.equal([...r.a].length, 300);
  assert.equal(r.a, '😀'.repeat(300));
  const exact = 'y'.repeat(300);
  assert.equal(requestHistory([turn(1, exact, exact)])[0].q, exact);
});

test('requestMe: valid time, distance and activity, or nothing; a bad pace is left out', () => {
  const ok = { elapsedSec: 600, distanceM: 1500, paceSecPerKm: 400, activity: 'moving' };
  assert.deepEqual(requestMe(ok), ok);
  assert.equal(requestMe(null), undefined);
  assert.equal(requestMe(undefined), undefined);
  assert.equal(requestMe({ ...ok, elapsedSec: -1 }), undefined);
  assert.equal(requestMe({ ...ok, distanceM: Number.NaN }), undefined);
  assert.equal(requestMe({ ...ok, distanceM: Infinity }), undefined);
  assert.equal(requestMe({ ...ok, activity: 'running' }), undefined);
  assert.deepEqual(requestMe({ ...ok, paceSecPerKm: null }), { elapsedSec: 600, distanceM: 1500, activity: 'moving' });
  assert.deepEqual(requestMe({ ...ok, paceSecPerKm: -5, activity: 'stopped' }), {
    elapsedSec: 600,
    distanceM: 1500,
    activity: 'stopped',
  });
  assert.deepEqual(requestMe({ ...ok, elapsedSec: 0, distanceM: 0 }), { ...ok, elapsedSec: 0, distanceM: 0 });
});

test('entry questions: kinds, per-kind answer limit, position order without mutating', () => {
  assert.deepEqual([...QUESTION_KINDS], ['short', 'long', 'links']);
  assert.equal(answerLimit('short'), ANSWER_LIMITS.short);
  assert.equal(answerLimit('long'), ANSWER_LIMITS.long);
  assert.equal(answerLimit('links'), ANSWER_LIMITS.link);
  const q = (id, position) => ({ id, position, kind: 'short', prompt: id, required: false });
  const input = [q('c', 2), q('a', 0), q('b', 1)];
  assert.deepEqual(ordered(input).map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(input.map((x) => x.id), ['c', 'a', 'b']);
  assert.deepEqual(ordered([]), []);
});

test('reminder card key prefix', () => {
  assert.equal(REMINDER_CARD_KEY_PREFIX, 'qrewing.reminderCard.v1.');
  assert.ok(reminderCardKey('r9').startsWith(REMINDER_CARD_KEY_PREFIX));
  assert.notEqual(REMINDER_CARD_KEY_PREFIX, ASK_KEY_PREFIX);
});

test('Emergency fold: at 3 in chat only, until shown', () => {
  assert.equal(EMERGENCY_FOLD_AT, 3);
  const f = (o) => emergenciesFolded({ place: 'chat', count: EMERGENCY_FOLD_AT, shown: false, ...o });
  assert.equal(f({}), true);
  assert.equal(f({ count: EMERGENCY_FOLD_AT - 1 }), false);
  assert.equal(f({ count: 10 }), true);
  assert.equal(f({ shown: true }), false);
  assert.equal(f({ place: 'other' }), false);
});
