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
