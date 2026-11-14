// Run: npm test. #1 / #12: who has seen an Emergency, and one vibration per Emergency across screens.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAnnouncer, emergencyBarMode, seenSummary } from '../src/lib/emergency-plan.ts';

const names = new Map([
  ['u1', 'Mina'],
  ['u2', 'Joon'],
]);

test('seenSummary names current members and counts only them', () => {
  assert.deepEqual(seenSummary(new Set(['u1', 'u2']), names), { who: ['Mina', 'Joon'], seen: 2 });
});

test('seenSummary leaves out a member who left, in the names and the count', () => {
  assert.deepEqual(seenSummary(new Set(['u1', 'gone']), names), { who: ['Mina'], seen: 1 });
});

test('seenSummary with no acks', () => {
  assert.deepEqual(seenSummary(new Set(), names), { who: [], seen: 0 });
});

test('announcer: seeded ids are never announced', () => {
  const a = createAnnouncer();
  a.seed(['e1']);
  assert.deepEqual(a.fresh(['e1']), []);
});

test('announcer: a new Emergency is announced once, however many screens see it', () => {
  const a = createAnnouncer();
  a.seed([]); // chat screen first load
  a.seed([]); // map screen first load
  assert.deepEqual(a.fresh(['e2']), ['e2']); // chat sees it first
  assert.deepEqual(a.fresh(['e2']), []); // map sees the same one
});

test('announcer: a screen opened after the alert does not re-announce it', () => {
  const a = createAnnouncer();
  assert.deepEqual(a.fresh(['e3']), ['e3']);
  a.seed(['e3']);
  assert.deepEqual(a.fresh(['e3']), []);
});

test('emergencyBarMode: chat shows the bar until I see it, then the line', () => {
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: false, expanded: false }), 'bar');
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: true, expanded: false }), 'line');
});

test('emergencyBarMode: my own Emergency keeps the bar in chat, the line elsewhere', () => {
  assert.equal(emergencyBarMode({ place: 'chat', mine: true, acked: false, expanded: false }), 'bar');
  assert.equal(emergencyBarMode({ place: 'other', mine: true, acked: false, expanded: false }), 'line');
});

test('emergencyBarMode: Map, Photos and Info show the line, Open expands it', () => {
  assert.equal(emergencyBarMode({ place: 'other', mine: false, acked: false, expanded: false }), 'line');
  assert.equal(emergencyBarMode({ place: 'other', mine: false, acked: true, expanded: true }), 'bar');
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: true, expanded: true }), 'bar');
});
