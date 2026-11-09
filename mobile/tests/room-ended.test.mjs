// Run: npm test. Qrew unit 5 (Q 06.04): the ended screen's closed-at time is shown only when it is known.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { roomClosedAtMs, sameLocalDay } from '../src/lib/room-ended.ts';

const NOW = Date.UTC(2026, 10, 9, 20);
const iso = (ms) => new Date(ms).toISOString();

test('roomClosedAtMs: no room row means no time', () => {
  assert.equal(roomClosedAtMs(null, NOW), null);
  assert.equal(roomClosedAtMs(undefined, NOW), null);
});

test('roomClosedAtMs: the host end time wins over the planned end', () => {
  const ended = NOW - 600_000;
  assert.equal(roomClosedAtMs({ deleted_at: iso(ended), expires_at: iso(NOW + 3_600_000) }, NOW), ended);
});

test('roomClosedAtMs: a passed end time is the closed time; a future one is not', () => {
  assert.equal(roomClosedAtMs({ deleted_at: null, expires_at: iso(NOW - 1000) }, NOW), NOW - 1000);
  assert.equal(roomClosedAtMs({ deleted_at: null, expires_at: iso(NOW) }, NOW), NOW);
  assert.equal(roomClosedAtMs({ deleted_at: null, expires_at: iso(NOW + 1000) }, NOW), null);
});

test('roomClosedAtMs: unreadable times give no time', () => {
  assert.equal(roomClosedAtMs({ deleted_at: 'x', expires_at: iso(NOW - 1000) }, NOW), null);
  assert.equal(roomClosedAtMs({ deleted_at: null, expires_at: 'x' }, NOW), null);
});

test('sameLocalDay', () => {
  const noon = new Date(2026, 10, 9, 12).getTime();
  assert.equal(sameLocalDay(noon, new Date(2026, 10, 9, 23, 59).getTime()), true);
  assert.equal(sameLocalDay(noon, new Date(2026, 10, 10, 0, 0).getTime()), false);
});
