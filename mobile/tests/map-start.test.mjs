// Run: npm test. UX P1-8: the room map never opens on the world view.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { mapStartCamera, spanZoom } from '../src/lib/map-start.ts';

const regional = { coordinates: { latitude: 37.77, longitude: -122.42 }, zoom: 10 };
const base = { livePointsCamera: null, place: null, routeCamera: null, mine: null, regional, maxZoom: 15 };
const fit = { coordinates: { latitude: 1, longitude: 2 }, zoom: 13 };
const place = { latitude: 37.77, longitude: -122.45 };
const mine = { latitude: 37.5, longitude: -122.3 };

test('order: live positions, place, route, my position, regional', () => {
  assert.deepEqual(mapStartCamera({ ...base, livePointsCamera: fit, place, mine }), { camera: fit, rank: 3 });
  assert.equal(mapStartCamera({ ...base, place, routeCamera: fit, mine }).camera.coordinates, place);
  assert.deepEqual(mapStartCamera({ ...base, routeCamera: fit, mine }), { camera: fit, rank: 3 });
  const m = mapStartCamera({ ...base, mine });
  assert.equal(m.rank, 2);
  assert.equal(m.camera.coordinates, mine);
  assert.deepEqual(mapStartCamera(base), { camera: regional, rank: 1 });
});

test('a single point opens at about a 1.5 km span, capped at the closest zoom', () => {
  const z = spanZoom(37.77, 20);
  assert.ok(z > 14 && z < 15.2, String(z));
  assert.equal(spanZoom(0, 14), 14);
  // The zoom matches the span: meters across 360 pt at that zoom is about 1500.
  const across = (360 * 156543.03 * Math.cos((37.77 * Math.PI) / 180)) / 2 ** z;
  assert.ok(Math.abs(across - 1500) < 60, String(across));
});

test('map screen uses the start camera, and Recenter needs more than the regional default', () => {
  const map = readFileSync(new URL('../src/app/room/[id]/map.tsx', import.meta.url), 'utf8');
  assert.match(map, /mapStartCamera\(\{/);
  assert.doesNotMatch(map, /function roomCamera/);
  assert.match(map, /start\.rank > 1 \? \(/);
});
