// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  distanceMeters,
  formatAge,
  formatSpeedKmh,
  HEARTBEAT_MS,
  isStale,
  MAX_ROUTE_POINTS,
  parseRoute,
  reconcileShare,
  REPORT_MIN_INTERVAL_MS,
  shouldReport,
  STALE_AFTER_MS,
  toRoutePayload,
} from '../src/lib/location-plan.ts';

const A = { latitude: 37.5665, longitude: 126.978 };
// About 111 m north of A.
const B = { latitude: 37.5675, longitude: 126.978 };
// About 1 m north of A.
const NEAR = { latitude: 37.56651, longitude: 126.978 };

test('distance is about 111 m per 0.001 degree of latitude', () => {
  const d = distanceMeters(A, B);
  assert.ok(d > 105 && d < 117, String(d));
  assert.equal(distanceMeters(A, A), 0);
});

test('first valid fix is always sent', () => {
  assert.equal(shouldReport(null, A, 0), true);
});

test('never more than one report per 5 s, even for a big move', () => {
  const last = { ...A, atMs: 1_000 };
  assert.equal(shouldReport(last, B, 1_000 + REPORT_MIN_INTERVAL_MS - 1), false);
  assert.equal(shouldReport(last, B, 1_000 + REPORT_MIN_INTERVAL_MS), true);
});

test('a small move waits for the heartbeat', () => {
  const last = { ...A, atMs: 0 };
  assert.equal(shouldReport(last, NEAR, REPORT_MIN_INTERVAL_MS + 1), false);
  assert.equal(shouldReport(last, NEAR, HEARTBEAT_MS), true);
});

test('heartbeat is shorter than the stale threshold', () => {
  assert.ok(HEARTBEAT_MS < STALE_AFTER_MS);
});

test('invalid coordinates are never sent', () => {
  assert.equal(shouldReport(null, { latitude: NaN, longitude: 0 }, 0), false);
  assert.equal(shouldReport(null, { latitude: 91, longitude: 0 }, 0), false);
  assert.equal(shouldReport(null, { latitude: 0, longitude: -181 }, 0), false);
});

test('stale after 60 s and for unparseable times', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  assert.equal(isStale('2026-11-05T11:59:30Z', now), false);
  assert.equal(isStale('2026-11-05T11:58:59Z', now), true);
  assert.equal(isStale('not a date', now), true);
});

test('age labels', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  assert.equal(formatAge('2026-11-05T11:59:40Z', now), 'just now');
  assert.equal(formatAge('2026-11-05T11:57:00Z', now), '3 min ago');
  assert.equal(formatAge('2026-11-05T09:30:00Z', now), '2 h ago');
});

test('speed in km/h; unknown stays unknown', () => {
  assert.equal(formatSpeedKmh(2.5), '9.0 km/h');
  assert.equal(formatSpeedKmh(null), null);
  assert.equal(formatSpeedKmh(-1), null);
  assert.equal(formatSpeedKmh(Infinity), null);
});

test('route parsing skips malformed points', () => {
  const route = [{ lat: 1, lng: 2 }, { lat: '3', lng: 4 }, null, { lat: 95, lng: 0 }, { lat: -1, lng: -2, x: 9 }];
  assert.deepEqual(parseRoute(route), [
    { latitude: 1, longitude: 2 },
    { latitude: -1, longitude: -2 },
  ]);
  assert.deepEqual(parseRoute({}), []);
  assert.deepEqual(parseRoute(null), []);
});

test('route payload is {lat, lng}, capped at the server limit', () => {
  assert.deepEqual(toRoutePayload([A]), [{ lat: A.latitude, lng: A.longitude }]);
  const many = Array.from({ length: MAX_ROUTE_POINTS + 5 }, () => A);
  assert.equal(toRoutePayload(many).length, MAX_ROUTE_POINTS);
});

// M7: the opt-in race between the share read and the set_share_location RPC.
test('reconcileShare ignores a read while an opt-in RPC is pending', () => {
  for (const server of [true, false]) {
    assert.equal(reconcileShare({ server, consented: true, pending: true, genAtStart: 1, genNow: 1 }), 'ignore');
  }
});

test('reconcileShare ignores a read that began before consent last changed', () => {
  assert.equal(reconcileShare({ server: false, consented: true, pending: false, genAtStart: 1, genNow: 2 }), 'ignore');
  assert.equal(reconcileShare({ server: true, consented: false, pending: false, genAtStart: 3, genNow: 4 }), 'ignore');
});

test('reconcileShare on a current read', () => {
  const read = (server, consented) => reconcileShare({ server, consented, pending: false, genAtStart: 5, genNow: 5 });
  assert.equal(read(true, true), 'on');
  // Left on by an earlier run or another device: switched off, never resumed silently.
  assert.equal(read(true, false), 'turn-off-server');
  // The server stopped it (activity ended, location disallowed, left the room).
  assert.equal(read(false, true), 'drop-consent');
  assert.equal(read(false, false), 'off');
});
