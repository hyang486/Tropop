// Run: npm test (node --test, Node 24 strips the .ts types).
// P2: grouped member labels (pure screen-space grouping, label ids, anchors).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupPins, labelAnchor, labelId, labelPins, planLabels, planPins } from '../src/lib/location-plan.ts';

const at = (id, x, y, shape = 'marker', text = `${id} · 4.3 km/h`) => ({
  id,
  x,
  y,
  shape,
  text,
  stale: false,
  coordinates: { latitude: 0, longitude: 0 },
});
const ids = (groups) => groups.map((g) => g.map((m) => m.id));

test('groupPins: a lone pin is its own group', () => {
  assert.deepEqual(ids(groupPins([at('a', 100, 100)])), [['a']]);
  assert.deepEqual(groupPins([]), []);
});

test('groupPins: pins far apart on screen stay separate', () => {
  const groups = groupPins([at('a', 60, 80), at('b', 300, 80), at('c', 60, 300), at('d', 300, 300)]);
  assert.deepEqual(ids(groups), [['a'], ['b'], ['c'], ['d']]);
});

test('groupPins: pins side by side whose one-line pills would overlap are one group', () => {
  // 80 pt apart at the same height: the pins do not touch, but two ~130 pt pills under them would.
  assert.deepEqual(ids(groupPins([at('a', 100, 100), at('b', 180, 100)])), [['a', 'b']]);
});

test('groupPins: a pin right under another (inside its pill) joins it', () => {
  assert.deepEqual(ids(groupPins([at('a', 100, 100), at('b', 100, 150)])), [['a', 'b']]);
  // Well below the pill and the balloon: separate.
  assert.deepEqual(ids(groupPins([at('a', 100, 100), at('b', 100, 200)])), [['a'], ['b']]);
});

test('groupPins: single link chains close pins into one group', () => {
  const chain = [at('a', 40, 100), at('b', 110, 100), at('c', 180, 100), at('d', 250, 100)];
  assert.deepEqual(ids(groupPins(chain)), [['a', 'b', 'c', 'd']]);
});

test('groupPins: a grown pill can pull in a pin below it', () => {
  // b alone is clear of a's one-line pill, but the 3-line pill of a, x, y reaches it.
  const one = groupPins([at('a', 100, 100), at('b', 100, 190)]);
  assert.deepEqual(ids(one), [['a'], ['b']]);
  const three = groupPins([at('a', 100, 100), at('x', 90, 70), at('y', 110, 60), at('b', 100, 190)]);
  assert.deepEqual(ids(three), [['y', 'x', 'a', 'b']]);
});

test('groupPins: deterministic, whatever the input order; groups by smallest id, lines top to bottom', () => {
  const pins = [at('d', 300, 300), at('b', 100, 80), at('c', 300, 320), at('a', 120, 60)];
  const expected = [['a', 'b'], ['d', 'c']];
  assert.deepEqual(ids(groupPins(pins)), expected);
  assert.deepEqual(ids(groupPins([...pins].reverse())), expected);
  assert.deepEqual(ids(groupPins([pins[2], pins[0], pins[3], pins[1]])), expected);
});

test('labelAnchor: the pill starts 3 pt under the balloon tip, or 25 + 3 pt under a photo point', () => {
  assert.deepEqual(labelAnchor('marker', 1), { x: 0.5, y: -3 / 30 });
  assert.deepEqual(labelAnchor('photo', 1), { x: 0.5, y: -28 / 30 });
  // A taller pill: the same offset in points, so a smaller fraction.
  assert.deepEqual(labelAnchor('photo', 3), { x: 0.5, y: -28 / 70 });
});

test('labelId: changes with the member set, a member going stale, a shape change or the pin it hangs under', () => {
  const a = { id: 'u1', shape: 'photo' };
  const b = { id: 'u2', shape: 'marker' };
  const base = labelId([a, b], a);
  assert.equal(base, labelId([b, a], a), 'member order does not matter');
  assert.equal(base, 'label:u1=photo,u2=marker@u1=photo');
  const variants = [
    labelId([a], a),
    labelId([a, b, { id: 'u3', shape: 'marker' }], a),
    labelId([a, { id: 'u2:stale', shape: 'marker' }], a),
    labelId([{ id: 'u1', shape: 'marker' }, b], { id: 'u1', shape: 'marker' }),
    labelId([a, b], b),
  ];
  assert.equal(new Set([base, ...variants]).size, variants.length + 1);
});

test('planLabels: a lone member keeps a one-line pill under its own pin', () => {
  const pins = [{ id: 'u1', coordinates: { latitude: 37.7, longitude: -122.4 }, shape: 'photo', text: 'You · 4.3 km/h', stale: false }];
  const view = { center: { latitude: 37.7, longitude: -122.4 }, scale: 30000, bearing: 0 };
  assert.deepEqual(planLabels(pins, view, { width: 370, height: 360 }), [
    {
      id: 'label:u1=photo@u1=photo',
      coordinates: pins[0].coordinates,
      text: 'You · 4.3 km/h',
      anchor: labelAnchor('photo', 1),
      lines: 1,
      stale: false,
      members: ['u1'],
    },
  ]);
});

test('planLabels: a group gets one pill, lines top to bottom, under the pin that reaches lowest', () => {
  const view = { center: { latitude: 37.7, longitude: -122.4 }, scale: 30000, bearing: 0 };
  const size = { width: 370, height: 360 };
  // About 1 m apart: one group. The marker point is a little south of the photo point, but the photo's
  // lower half reaches lower on screen, so the pill hangs under the photo.
  const photo = { id: 'p', coordinates: { latitude: 37.70001, longitude: -122.4 }, shape: 'photo', text: 'Pat · 1.0 km/h', stale: false };
  const marker = { id: 'm', coordinates: { latitude: 37.7, longitude: -122.40001 }, shape: 'marker', text: 'Mo · stale', stale: true };
  const [label, ...rest] = planLabels([marker, photo], view, size);
  assert.equal(rest.length, 0);
  assert.equal(label.text, 'Pat · 1.0 km/h\nMo · stale');
  assert.equal(label.lines, 2);
  assert.equal(label.coordinates, photo.coordinates);
  assert.deepEqual(label.anchor, labelAnchor('photo', 2));
  assert.equal(label.id, 'label:m=marker,p=photo@p=photo');
  assert.equal(label.stale, false, 'one fresh member: normal text color');
  const allStale = planLabels([marker, { ...photo, stale: true }], view, size)[0];
  assert.equal(allStale.stale, true);
});

test('planLabels: with no viewport every pin keeps its own label', () => {
  const pins = [
    { id: 'b', coordinates: { latitude: 1, longitude: 1 }, shape: 'marker', text: 'B', stale: false },
    { id: 'a', coordinates: { latitude: 1, longitude: 1 }, shape: 'marker', text: 'A', stale: false },
  ];
  assert.deepEqual(
    planLabels(pins, null, { width: 370, height: 360 }).map((l) => l.members),
    [['a'], ['b']],
  );
});

test('labelPins: shape and stale come from the pin plan; the id follows the fresh/stale pin id', () => {
  const NOW = Date.parse('2026-11-07T12:00:00Z');
  const fresh = new Date(NOW - 5_000).toISOString();
  const old = new Date(NOW - 120_000).toISOString();
  const input = (userId, updatedAt, avatarPath) => ({
    userId,
    coordinates: { latitude: 37.7, longitude: -122.4 },
    updatedAt,
    speedMps: 1.2,
    label: userId,
    initialsOf: userId,
    avatarPath,
  });
  const pins = planPins(
    [input('u1', fresh, 'u1/a.jpg'), input('u2', fresh, null), input('u3', old, 'u3/a.jpg')],
    NOW,
    new Map([['u1/a.jpg', 'ICON'], ['u3/a.jpg', 'ICON']]),
  );
  assert.deepEqual(
    labelPins(pins).map(({ id, shape, text, stale }) => ({ id, shape, text, stale })),
    [
      { id: 'u1', shape: 'photo', text: 'u1 · 4.3 km/h', stale: false },
      { id: 'u2', shape: 'marker', text: 'u2 · 4.3 km/h', stale: false },
      { id: 'u3:stale', shape: 'marker', text: 'u3 · stale', stale: true },
    ],
  );
});
