// Run: npm test. Edge cases for the pure helpers behind Rooms and Room info (tests only).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { endsDay } from '../src/lib/chat-plan.ts';
import { arrivedMemberCount } from '../src/lib/info-plan.ts';

const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();

test('endsDay edge: an expiry already past still reads as today', () => {
  assert.equal(endsDay(at(2026, 11, 8, 23), at(2026, 11, 9, 8)), 'today');
});

test('endsDay edge: year boundary (Dec 31 -> Jan 1 is tomorrow, Jan 2 is later)', () => {
  assert.equal(endsDay(at(2027, 1, 1, 0, 30), at(2026, 12, 31, 23)), 'tomorrow');
  assert.equal(endsDay(at(2027, 1, 2, 9), at(2026, 12, 31, 9)), 'later');
});

test('endsDay edge: a 25-hour DST day still counts as one day (local midnights, rounded)', () => {
  // US fall-back 2026-11-01; outside a DST zone this is an ordinary day and must give the same answers.
  assert.equal(endsDay(at(2026, 11, 2, 0, 30), at(2026, 10, 31, 23)), 'later');
  assert.equal(endsDay(at(2026, 11, 1, 23), at(2026, 10, 31, 23)), 'tomorrow');
});

test('endsDay edge: the last minute of today and the first minute of tomorrow', () => {
  assert.equal(endsDay(at(2026, 11, 9, 23, 59), at(2026, 11, 9, 0)), 'today');
  assert.equal(endsDay(at(2026, 11, 10, 0, 0), at(2026, 11, 9, 23, 59)), 'tomorrow');
});

test('arrivedMemberCount edge: a member id listed twice still counts once', () => {
  assert.equal(arrivedMemberCount(['a', 'a', 'b'], ['a', 'b']), 2);
});

test('arrivedMemberCount edge: everyone arrived equals the member count', () => {
  assert.equal(arrivedMemberCount(['a', 'b', 'c'], ['c', 'b', 'a']), 3);
});
