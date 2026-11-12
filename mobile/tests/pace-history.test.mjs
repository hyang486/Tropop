// Run: npm test. Qrewing AI pace maker history (spec 3.4): last 20 sessions, recap summary per room.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HISTORY_LIMIT, mergeSession, parseHistory, summaryFor } from '../src/features/pace/pace-core.ts';

const s = (roomId, startedAt, distanceM = 1000) => ({
  roomId,
  startedAt,
  durationS: 300,
  distanceM,
  avgSecPerKm: distanceM >= 100 ? 300 : null,
  splits: [],
});

test('a running session saved again replaces itself; history stays newest first', () => {
  let h = mergeSession([], s('a', 1));
  h = mergeSession(h, s('b', 2));
  h = mergeSession(h, { ...s('a', 1), distanceM: 2000 });
  assert.deepEqual(h.map((x) => [x.roomId, x.startedAt, x.distanceM]), [
    ['b', 2, 1000],
    ['a', 1, 2000],
  ]);
});

test('only the last 20 sessions are kept', () => {
  let h = [];
  for (let i = 0; i < 25; i++) h = mergeSession(h, s('r', i));
  assert.equal(h.length, HISTORY_LIMIT);
  assert.equal(h[0].startedAt, 24);
  assert.equal(h[HISTORY_LIMIT - 1].startedAt, 5);
});

test('stored history that is not valid JSON or has bad rows is dropped, not thrown', () => {
  assert.deepEqual(parseHistory(null), []);
  assert.deepEqual(parseHistory('{nope'), []);
  assert.deepEqual(parseHistory('{"a":1}'), []);
  const good = s('a', 1);
  assert.deepEqual(parseHistory(JSON.stringify([good, { roomId: 3 }, null])), [good]);
});

test('recap summary: the latest session in that room with an average pace, else null', () => {
  // startedAt 5 has 50 m (no average pace), so 3 is used.
  const h = [s('a', 1, 1500), s('a', 5, 50), s('a', 3, 2400.4), s('b', 9)];
  assert.deepEqual(summaryFor(h, 'a'), { distanceM: 2400, durationS: 300, avgSecPerKm: 300 });
  assert.equal(summaryFor(h, 'zzz'), null);
});

test('recap hand-off: no session in the room gives null and no line; a session gives one line', async () => {
  const { recapParts } = await import('../src/features/pace/pace-core.ts');
  const { paceStrings } = await import('../src/features/pace/strings.ts');
  assert.equal(summaryFor([], 'a'), null);
  assert.equal(summaryFor(parseHistory(null), 'a'), null);
  assert.equal(summaryFor([s('a', 1, 50)], 'a'), null);
  assert.equal(recapParts(null), null);
  const one = summaryFor([s('a', 1, 2400)], 'a');
  assert.deepEqual(Object.keys(one).sort(), ['avgSecPerKm', 'distanceM', 'durationS']);
  const p = recapParts(one);
  assert.equal(paceStrings.recap(p.distanceM, p.duration, p.pace), 'Pace maker: 2.40 km in 5:00, 5:00 per km');
});
