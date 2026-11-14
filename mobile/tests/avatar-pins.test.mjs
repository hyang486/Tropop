// Run: npm test (node --test, Node 24 strips the .ts types). UX P0-3 avatar pins.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AVATAR_PIN_RADIUS,
  AVATAR_RING_WIDTH,
  avatarPillAnchor,
  CLUSTER_METERS,
  distanceMeters,
  LABEL_GAP,
  LABEL_LINE_HEIGHT,
  LABEL_TEXT_PADDING,
  planAvatarPins,
  planPins,
  stalePinId,
  STALE_AFTER_MS,
} from '../src/lib/location-plan.ts';

const NOW = Date.parse('2026-11-14T12:00:00Z');
const FRESH = new Date(NOW - 10_000).toISOString();
const OLD = new Date(NOW - STALE_AFTER_MS - 1_000).toISOString();
const BASE = { latitude: 37.77, longitude: -122.45 };
/** A point `m` meters north of BASE. */
const north = (m) => ({ latitude: BASE.latitude + (m / 6_371_000) * (180 / Math.PI), longitude: BASE.longitude });
const person = (userId, name, coordinates, over = {}) => ({
  userId,
  coordinates,
  updatedAt: FRESH,
  speedMps: null,
  label: name,
  initialsOf: name,
  avatarPath: null,
  ...over,
});
function plan(inputs, { me = 'me', emergency = [], meters, onWay = [] } = {}) {
  const pins = planPins(inputs, NOW, new Map());
  const ids = new Set(emergency.flatMap((u) => [u, stalePinId(u)]));
  const way = new Set(onWay.flatMap((u) => [u, stalePinId(u)]));
  return planAvatarPins(pins, inputs, me, ids, meters, way);
}

test('V4: an On my way member gets a badge on their own pin, out of any cluster; the face key changes', () => {
  const pins = plan([person('jun', 'Jun', BASE), person('dani', 'Dani', north(5)), person('leo', 'Leo', north(10))], {
    onWay: ['dani'],
  });
  assert.equal(pins.length, 2);
  const dani = pins.find((p) => p.members.includes('dani'));
  assert.deepEqual(dani.face, { kind: 'other', text: 'D', stale: false, emergency: false, onWay: true });
  assert.deepEqual(pins.find((p) => p.face.kind === 'cluster').names, ['Jun', 'Leo']);
  const calm = plan([person('dani', 'Dani', BASE)]);
  assert.equal('onWay' in calm[0].face, false);
  assert.notEqual(calm[0].faceKey, plan([person('dani', 'Dani', BASE)], { onWay: ['dani'] })[0].faceKey);
});

test('V4: the 40 pt pin and its 5 pt halo fit expo-maps\' fixed 50 pt frame', () => {
  assert.equal(AVATAR_PIN_RADIUS * 2, 40);
  assert.ok(AVATAR_PIN_RADIUS + AVATAR_RING_WIDTH <= 25);
});

test('planAvatarPins: you are ink-filled, others white with their initial', () => {
  const [me, jun] = plan([person('me', 'You', BASE), person('jun', 'Jun Park', north(500))]);
  assert.deepEqual(me.face, { kind: 'me', text: 'Y', stale: false, emergency: false });
  assert.deepEqual(jun.face, { kind: 'other', text: 'J', stale: false, emergency: false });
  assert.deepEqual(jun.names, ['Jun Park']);
});

test('planAvatarPins: others within 30 m cluster into "+N" with every name; 30.1 m does not join', () => {
  assert.equal(CLUSTER_METERS, 30);
  const pins = plan([
    person('jun', 'Jun', BASE),
    person('dani', 'Dani', north(29.9)),
    person('leo', 'Leo', north(30.1)),
  ]);
  assert.equal(pins.length, 2);
  assert.equal(pins[0].face.kind, 'cluster');
  assert.equal(pins[0].face.text, '+2');
  assert.deepEqual(pins[0].names, ['Jun', 'Dani']);
  assert.deepEqual(pins[0].members, ['jun', 'dani']);
  assert.equal(pins[1].face.kind, 'other');
  assert.deepEqual(pins[1].names, ['Leo']);
});

test('planAvatarPins: exactly at the cluster distance still clusters (<=)', () => {
  const b = north(30);
  const edge = distanceMeters(BASE, b);
  const pins = plan([person('jun', 'Jun', BASE), person('dani', 'Dani', b)], { meters: edge });
  assert.equal(pins.length, 1);
  assert.equal(pins[0].face.text, '+2');
  const apart = plan([person('jun', 'Jun', BASE), person('dani', 'Dani', b)], { meters: edge - 1e-9 });
  assert.equal(apart.length, 2);
});

test('planAvatarPins: a person in Emergency inside a cluster stays their own pin with the red ring', () => {
  const pins = plan(
    [person('jun', 'Jun', BASE), person('sora', 'Sora', north(5)), person('dani', 'Dani', north(10))],
    { emergency: ['sora'] },
  );
  assert.equal(pins.length, 2);
  const sora = pins.find((p) => p.members.includes('sora'));
  assert.deepEqual(sora.face, { kind: 'other', text: 'S', stale: false, emergency: true });
  assert.deepEqual(sora.members, ['sora']);
  const cluster = pins.find((p) => p.face.kind === 'cluster');
  assert.deepEqual(cluster.names, ['Jun', 'Dani']);
  assert.equal(cluster.face.emergency, false);
  // Only the Emergency person is red.
  assert.equal(pins.filter((p) => p.face.emergency).length, 1);
});

test('planAvatarPins: a stale person in Emergency keeps the ring and stays out of your cluster', () => {
  const pins = plan(
    [person('me', 'You', BASE), person('sora', 'Sora', north(3), { updatedAt: OLD }), person('jun', 'Jun', north(6))],
    { emergency: ['sora'] },
  );
  assert.equal(pins.length, 2);
  assert.deepEqual(pins[0].face, { kind: 'my-cluster', text: '+2', stale: false, emergency: false });
  assert.deepEqual(pins[0].names, ['You', 'Jun']);
  assert.deepEqual(pins[1].face, { kind: 'other', text: 'S', stale: true, emergency: true });
  assert.equal(pins[1].members[0], stalePinId('sora'));
});

test('planAvatarPins: you and a member 20 m apart are one ink-filled "+2" (qa P0-3), apart you are "me"', () => {
  const near = plan([person('me', 'Mina', BASE), person('jun', 'Jun', north(20))]);
  assert.equal(near.length, 1);
  assert.equal(near[0].face.kind, 'my-cluster');
  assert.equal(near[0].face.text, '+2');
  const far = plan([person('me', 'Mina', BASE), person('jun', 'Jun', north(40))]);
  assert.deepEqual(far.map((p) => p.face.kind), ['me', 'other']);
});

test('planAvatarPins: a cluster is stale only when all its members are', () => {
  const mixed = plan([person('jun', 'Jun', BASE, { updatedAt: OLD }), person('dani', 'Dani', north(5))]);
  assert.equal(mixed[0].face.stale, false);
  const allOld = plan([
    person('jun', 'Jun', BASE, { updatedAt: OLD }),
    person('dani', 'Dani', north(5), { updatedAt: OLD }),
  ]);
  assert.equal(allOld[0].face.stale, true);
});

test('planAvatarPins: the pin id changes with its face, so the map redraws the icon', () => {
  const calm = plan([person('sora', 'Sora', BASE)]);
  const help = plan([person('sora', 'Sora', BASE)], { emergency: ['sora'] });
  assert.notEqual(calm[0].id, help[0].id);
  assert.notEqual(calm[0].faceKey, help[0].faceKey);
});

test('avatarPillAnchor: the pill clears the pin and its ring by LABEL_GAP, above or below', () => {
  const clear = AVATAR_PIN_RADIUS + AVATAR_RING_WIDTH + LABEL_GAP;
  const h1 = LABEL_LINE_HEIGHT + 2 * LABEL_TEXT_PADDING;
  assert.deepEqual(avatarPillAnchor(1, 'above'), { x: 0.5, y: 1 + clear / h1 });
  assert.deepEqual(avatarPillAnchor(1, 'below'), { x: 0.5, y: -clear / h1 });
  const h2 = 2 * LABEL_LINE_HEIGHT + 2 * LABEL_TEXT_PADDING;
  assert.deepEqual(avatarPillAnchor(2, 'above'), { x: 0.5, y: 1 + clear / h2 });
});
