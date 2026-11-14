// Tests only: pure pace/calendar helpers that had no direct test (no behavior change).
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const core = await import('../src/features/pace/pace-core.ts');
const data = await import('../src/features/calendar/calendar-data.ts');
const plan = await import('../src/features/calendar/calendar-plan.ts');

const fix = (accuracyM) => ({ latitude: 0, longitude: 0, atMs: 0, accuracyM });

test('noiseM: each fix counts its accuracy, floored and capped; missing or bad accuracy uses the floor', () => {
  const { MIN_NOISE_ACCURACY_M: MIN, MAX_NOISE_ACCURACY_M: MAX } = core;
  assert.equal(core.noiseM(fix(20), fix(30)), 50);
  assert.equal(core.noiseM(fix(3), fix(5)), 2 * MIN);
  assert.equal(core.noiseM(fix(MIN), fix(MIN)), 2 * MIN);
  assert.equal(core.noiseM(fix(400), fix(20)), MAX + 20);
  assert.equal(core.noiseM(fix(null), fix(undefined)), 2 * MIN);
  assert.equal(core.noiseM(fix(NaN), fix(Infinity)), 2 * MIN);
  assert.equal(core.noiseM(fix(-10), fix(MAX)), MIN + MAX);
});

test('defaultEmoji: one per room type, a pin for anything else', () => {
  assert.equal(data.defaultEmoji('sports'), '🏃');
  assert.equal(data.defaultEmoji('event'), '🎉');
  assert.equal(data.defaultEmoji('waiting'), '⏳');
  assert.equal(data.defaultEmoji('general'), '💬');
  assert.equal(data.defaultEmoji('unknown'), '📌');
  assert.equal(data.defaultEmoji(''), '📌');
  assert.equal(data.defaultEmoji('constructor'), '📌');
  assert.equal(data.defaultEmoji('__proto__'), '📌');
  assert.equal(data.defaultEmoji('toString'), '📌');
});

test('cleanDiary: drops non-strings and blank lines, trims, keeps the first DIARY_LINES, 90 chars each', () => {
  assert.deepEqual(data.cleanDiary([' a ', '', '   ', 7, null, 'b']), ['a', 'b']);
  assert.deepEqual(data.cleanDiary(['1', '2', '3', '4', '5']), ['1', '2', '3'].slice(0, data.DIARY_LINES));
  const long = data.cleanDiary(['x'.repeat(200)]);
  assert.equal(long[0].length, 90);
  assert.deepEqual(data.cleanDiary([]), []);
});

const item = (id, start, end) => ({ id, kind: 'event', title: id, start, end, emoji: '📌' });

test('itemsInMonth: keeps items overlapping the month, sorted by start, then longer first, then id', () => {
  const items = [
    item('after', '2026-12-01', '2026-12-02'),
    item('before', '2026-10-01', '2026-10-31'),
    item('spanIn', '2026-10-30', '2026-11-01'),
    item('spanOut', '2026-11-30', '2026-12-03'),
    item('b', '2026-11-05', '2026-11-05'),
    item('a', '2026-11-05', '2026-11-05'),
    item('long', '2026-11-05', '2026-11-09'),
    item('across', '2026-10-15', '2026-12-15'),
  ];
  const ids = plan.itemsInMonth(items, 2026, 10).map((it) => it.id);
  assert.deepEqual(ids, ['across', 'spanIn', 'long', 'a', 'b', 'spanOut']);
  assert.deepEqual(plan.itemsInMonth([], 2026, 10), []);
  assert.equal(items[0].id, 'after', 'input is not reordered');
});

test('itemsInMonth: February uses its real last day', () => {
  const items = [item('feb28', '2026-02-28', '2026-02-28'), item('mar1', '2026-03-01', '2026-03-01')];
  assert.deepEqual(plan.itemsInMonth(items, 2026, 1).map((it) => it.id), ['feb28']);
  const leap = [item('feb29', '2028-02-29', '2028-02-29')];
  assert.deepEqual(plan.itemsInMonth(leap, 2028, 1).map((it) => it.id), ['feb29']);
});

const loc = await import('../src/lib/location-plan.ts');

test('isValidLatLng: finite and within ±90 / ±180 only', () => {
  assert.equal(loc.isValidLatLng({ latitude: 37.5, longitude: 127 }), true);
  assert.equal(loc.isValidLatLng({ latitude: -90, longitude: 180 }), true);
  assert.equal(loc.isValidLatLng({ latitude: 90.01, longitude: 0 }), false);
  assert.equal(loc.isValidLatLng({ latitude: 0, longitude: -180.5 }), false);
  assert.equal(loc.isValidLatLng({ latitude: NaN, longitude: 0 }), false);
  assert.equal(loc.isValidLatLng({ latitude: 0, longitude: Infinity }), false);
  assert.equal(loc.isValidLatLng(null), false);
  assert.equal(loc.isValidLatLng(undefined), false);
});

test('wrapLines: a lone member with a " · " wraps once after the name; otherwise null', () => {
  assert.deepEqual(loc.wrapLines([{ text: 'Guest 3 (17e) · Need water' }]), ['Guest 3 (17e)', 'Need water']);
  assert.deepEqual(loc.wrapLines([{ text: 'Mina · 5 km/h · Need water' }]), ['Mina', '5 km/h · Need water'], 'wraps once, after the name');
  assert.equal(loc.wrapLines([{ text: 'Mina' }]), null);
  assert.equal(loc.wrapLines([{ text: 'A · x' }, { text: 'B · y' }]), null, 'groups keep one line per member');
  assert.equal(loc.wrapLines([]), null);
});

test('planAnchor: keeps the pin-facing edge fixed for each placement', () => {
  const rect = { left: 0, right: 100, top: 20, bottom: 50 };
  const pin = { x: 25, y: 17 };
  const below = loc.planAnchor({ rect, pin, placement: 'below' }, 1);
  assert.equal(below.x, 0.25);
  assert.equal(below.y, -3 / 30);
  const above = loc.planAnchor({ rect, pin: { x: 50, y: 53 }, placement: 'above' }, 1);
  assert.deepEqual(above, { x: 0.5, y: 1 + 3 / 30 });
  const beside = loc.planAnchor({ rect, pin: { x: 100, y: 35 }, placement: 'right' }, 2);
  assert.deepEqual(beside, { x: 1, y: 0.5 });
  assert.equal(loc.planAnchor({ rect: { left: 5, right: 5, top: 0, bottom: 0 }, pin, placement: 'below' }, 0).x, 0.5, 'zero width');
});

test('avatarFaceKey: changes with each drawn field', () => {
  const face = { kind: 'other', text: 'M', stale: false, emergency: false };
  const keys = new Set([
    loc.avatarFaceKey(face),
    loc.avatarFaceKey({ ...face, kind: 'me' }),
    loc.avatarFaceKey({ ...face, text: 'J' }),
    loc.avatarFaceKey({ ...face, stale: true }),
    loc.avatarFaceKey({ ...face, emergency: true }),
  ]);
  assert.equal(keys.size, 5);
  assert.equal(loc.avatarFaceKey({ ...face, names: ['x'] }), loc.avatarFaceKey(face), 'names are not drawn on the face');
});
