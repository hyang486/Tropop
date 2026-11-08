// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  cameraFor,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  ROOM_MAP_PADDING,
  ROOM_MAP_SIZE,
} from '../src/lib/location-plan.ts';

const p = (latitude, longitude) => ({ latitude, longitude });
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / RAD;
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Where MapKit draws `point`, in view points, for an expo-maps camera: expo-maps asks for a region of
 * 360 / 2^zoom degrees on both axes and MapKit scales that region to fit inside the view. This model uses
 * the exact Mercator height of the region, independent of the cos(lat) shortcut in cameraFor.
 */
function project(point, camera, size) {
  const span = 360 / 2 ** camera.zoom;
  const c = camera.coordinates;
  const regionHeight = mercY(c.latitude + span / 2) - mercY(c.latitude - span / 2);
  const scale = Math.min(size.width / span, size.height / regionHeight);
  let dLng = point.longitude - c.longitude;
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  return {
    x: size.width / 2 + dLng * scale,
    y: size.height / 2 - (mercY(point.latitude) - mercY(c.latitude)) * scale,
  };
}

/** Every point lands inside the padded rect, within `slack` points. */
function assertInside(points, camera, size, padding, slack = 1) {
  for (const point of points) {
    const { x, y } = project(point, camera, size);
    assert.ok(x >= padding.left - slack && x <= size.width - padding.right + slack, `x ${x} for ${JSON.stringify(point)}`);
    assert.ok(y >= padding.top - slack && y <= size.height - padding.bottom + slack, `y ${y} for ${JSON.stringify(point)}`);
  }
}

/** The points fill the padded rect along at least one axis (the fit is tight, not just safe). */
function assertTight(points, camera, size, padding, slack = 1) {
  const xs = points.map((pt) => project(pt, camera, size).x);
  const ys = points.map((pt) => project(pt, camera, size).y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const innerW = size.width - padding.left - padding.right;
  const innerH = size.height - padding.top - padding.bottom;
  assert.ok(Math.abs(w - innerW) < slack || Math.abs(h - innerH) < slack, `box ${w} x ${h} in ${innerW} x ${innerH}`);
}

// A north-south route through San Francisco: taller than wide, so latitude binds (the 5b clipping case).
const TALL = [p(37.7793, -122.4193), p(37.7810, -122.4170), p(37.7900, -122.4150), p(37.8010, -122.4100)];
// An east-west route: wider than tall.
const WIDE = [p(37.7793, -122.4600), p(37.7800, -122.4300), p(37.7810, -122.4000)];

test('no points: no camera', () => {
  assert.equal(cameraFor([]), null);
  assert.equal(cameraFor([p(NaN, 0), p(91, 0)]), null);
});

test('one point: street level, nudged so its pin clears the uneven top and bottom padding', () => {
  const cam = cameraFor([p(37.7793, -122.4193)]);
  assert.equal(cam.zoom, MAX_CAMERA_ZOOM);
  assert.ok(near(cam.coordinates.longitude, -122.4193));
  // Top padding is larger, so the center sits a little north of the point and the point a little below middle.
  assert.ok(cam.coordinates.latitude > 37.7793 && cam.coordinates.latitude < 37.7795, `lat ${cam.coordinates.latitude}`);
  const { y } = project(p(37.7793, -122.4193), cam, ROOM_MAP_SIZE);
  const mid = (ROOM_MAP_PADDING.top + ROOM_MAP_SIZE.height - ROOM_MAP_PADDING.bottom) / 2;
  assert.ok(Math.abs(y - mid) < 0.5, `y ${y} vs ${mid}`);
});

test('one point with no padding: exactly on that point', () => {
  const cam = cameraFor([p(37.7793, -122.4193)], ROOM_MAP_SIZE, NO_PADDING);
  assert.deepEqual(cam, { coordinates: p(37.7793, -122.4193), zoom: MAX_CAMERA_ZOOM });
});

test('5b: a tall city route sits inside the padded rect on the room map, and fills it', () => {
  const cam = cameraFor(TALL);
  assert.ok(cam.zoom > 10 && cam.zoom < MAX_CAMERA_ZOOM, `zoom ${cam.zoom}`);
  assertInside(TALL, cam, ROOM_MAP_SIZE, ROOM_MAP_PADDING);
  assertTight(TALL, cam, ROOM_MAP_SIZE, ROOM_MAP_PADDING);
});

test('5b: a wide city route sits inside the padded rect, and fills it', () => {
  const cam = cameraFor(WIDE);
  assertInside(WIDE, cam, ROOM_MAP_SIZE, ROOM_MAP_PADDING);
  assertTight(WIDE, cam, ROOM_MAP_SIZE, ROOM_MAP_PADDING);
});

test('5b: the fit follows the measured map size (a narrower or taller view)', () => {
  for (const size of [{ width: 343, height: 360 }, { width: 402, height: 600 }, { width: 600, height: 300 }]) {
    for (const route of [TALL, WIDE]) {
      const cam = cameraFor(route, size);
      assertInside(route, cam, size, ROOM_MAP_PADDING);
      assertTight(route, cam, size, ROOM_MAP_PADDING);
    }
  }
});

test('5b: with no padding the box reaches the view edges, so the padding is what keeps it clear', () => {
  const cam = cameraFor(TALL, ROOM_MAP_SIZE, NO_PADDING);
  assertInside(TALL, cam, ROOM_MAP_SIZE, NO_PADDING);
  assertTight(TALL, cam, ROOM_MAP_SIZE, NO_PADDING);
  // The padded camera is zoomed further out than the unpadded one.
  assert.ok(cameraFor(TALL).zoom < cam.zoom);
});

test('5b: the old 1.4x span margin put the tall route under the top overlay and pin', () => {
  // Pre-fix camera: middle of the lat/lng box, span = max(latSpan, lngSpan) * 1.4.
  const lats = TALL.map((pt) => pt.latitude);
  const lngs = TALL.map((pt) => pt.longitude);
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs)) * 1.4;
  const old = {
    coordinates: p((Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2),
    zoom: Math.log2(360 / span),
  };
  const topY = Math.min(...TALL.map((pt) => project(pt, old, ROOM_MAP_SIZE).y));
  assert.ok(topY < ROOM_MAP_PADDING.top, `old top ${topY}`);
});

test('padding larger than the view still leaves the points a quarter of it', () => {
  const huge = { top: 300, bottom: 300, left: 300, right: 300 };
  const cam = cameraFor(TALL, ROOM_MAP_SIZE, huge);
  assert.ok(Number.isFinite(cam.zoom) && cam.zoom >= MIN_CAMERA_ZOOM);
  assert.ok(Number.isFinite(cam.coordinates.latitude) && Number.isFinite(cam.coordinates.longitude));
});

test('the R1 world-scale route (F5-3) fits instead of street-level water', () => {
  const route = [p(-16.1865410712183, -31.9921875), p(4.68227962838259, 17.2265625), p(-44.757135998073, -3.8671875)];
  const cam = cameraFor(route);
  assert.ok(cam.zoom > 1 && cam.zoom < 3, `zoom ${cam.zoom}`);
  assert.ok(near(cam.coordinates.longitude, -7.3828125));
  // At this scale the cos(lat) shortcut drifts a little from the exact Mercator height: allow a few points.
  assertInside(route, cam, ROOM_MAP_SIZE, ROOM_MAP_PADDING, 8);
});

test('a very small span is clamped to street level', () => {
  const cam = cameraFor([p(37.7793, -122.4193), p(37.77931, -122.41931)]);
  assert.equal(cam.zoom, MAX_CAMERA_ZOOM);
});

test('points across the globe are clamped to the world view', () => {
  const cam = cameraFor([p(-80, -170), p(80, 10)]);
  assert.equal(cam.zoom, MIN_CAMERA_ZOOM);
});

test('a route across the antimeridian is centered on it, not on the far side of the world', () => {
  const cam = cameraFor([p(-17, 179), p(-18, -179)]);
  assert.ok(Math.abs(Math.abs(cam.coordinates.longitude) - 180) < 1e-9, `lng ${cam.coordinates.longitude}`);
  assert.ok(cam.zoom > 6, `zoom ${cam.zoom}`);
  assertInside([p(-17, 179), p(-18, -179)], cam, ROOM_MAP_SIZE, ROOM_MAP_PADDING);
});

test('the antimeridian center stays in [-180, 180]', () => {
  const cam = cameraFor([p(0, 170), p(0, -160)]);
  assert.ok(near(cam.coordinates.longitude, -175));
});
