// Run: npm test. Qrewing AI pace maker history (spec 3.4): last 20 sessions, recap summary per room.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  HISTORY_LIMIT,
  mergeSession,
  paceCue,
  parseHistory,
  summaryFor,
  targetSecPerKm,
  usualPace,
} from '../src/features/pace/pace-core.ts';

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
  // Saved before elapsedS existed: elapsed falls back to the moving time.
  assert.deepEqual(summaryFor(h, 'a'), { distanceM: 2400, durationS: 300, elapsedS: 300, avgSecPerKm: 300 });
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
  assert.deepEqual(Object.keys(one).sort(), ['avgSecPerKm', 'distanceM', 'durationS', 'elapsedS']);
  const p = recapParts(one);
  assert.equal(paceStrings.recap(p.distanceM, p.moving, p.total, p.pace), 'Pace maker: 2.40 km, moving 5:00, total 5:00, 5:00 per km');
  // A long stop shows in the total.
  const stopped = summaryFor([{ ...s('a', 1, 2400), durationS: 720, elapsedS: 1020, avgSecPerKm: 300 }], 'a');
  const q = recapParts(stopped);
  assert.equal(paceStrings.recap(q.distanceM, q.moving, q.total, q.pace), 'Pace maker: 2.40 km, moving 12:00, total 17:00, 5:00 per km');
  // Stored elapsedS is read back; a bad one drops the row.
  assert.equal(parseHistory(JSON.stringify([{ ...s('a', 1), elapsedS: 400 }]))[0].elapsedS, 400);
  assert.equal(parseHistory(JSON.stringify([{ ...s('a', 1), elapsedS: 'x' }])).length, 0);
});

test('usual pace learns from my own runs in every room (history is per phone, not per room)', () => {
  let h = mergeSession([], { ...s('room-a', 1), avgSecPerKm: 360 });
  h = mergeSession(h, { ...s('room-b', 2), avgSecPerKm: 340 });
  h = mergeSession(h, { ...s('room-c', 3), avgSecPerKm: 350 });
  assert.equal(usualPace(h), 350);
  // A new room with no session of its own still gets that usual pace as its target.
  assert.equal(targetSecPerKm({ kind: 'usual' }, usualPace(h)), 350);
});

test('first run: no history gives no usual target, so only km cues speak (no slow/fast nagging)', () => {
  const goal = targetSecPerKm({ kind: 'usual' }, usualPace([]));
  assert.equal(goal, null);
  const off = paceCue({ lastKm: 0, lastOffCueAtMs: null }, { nowMs: 600_000, km: 0, lastSplitS: null, recentSecPerKm: 420, targetSecPerKm: goal });
  assert.equal(off.cue, null);
  const km = paceCue({ lastKm: 0, lastOffCueAtMs: null }, { nowMs: 600_000, km: 1, lastSplitS: 400, recentSecPerKm: 400, targetSecPerKm: goal });
  assert.deepEqual(km.cue, { kind: 'km', km: 1, pace: '6:40', target: null });
});

test('the cap keeps the newest runs, so usual pace follows recent form, not old runs', () => {
  let h = [];
  for (let i = 0; i < 30; i++) h = mergeSession(h, { ...s('r', i), avgSecPerKm: i < 25 ? 480 : 300 });
  assert.equal(h.length, HISTORY_LIMIT);
  assert.equal(usualPace(h), 300); // the last 5 runs (25..29) are all 300
});

test('runs under 100 m have no pace and never pull the usual pace', () => {
  let h = mergeSession([], { ...s('r', 1), avgSecPerKm: 330 });
  h = mergeSession(h, s('r', 2, 50));
  assert.equal(h[0].avgSecPerKm, null);
  assert.equal(usualPace(h), 330);
});
