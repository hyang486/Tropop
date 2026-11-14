// Run: npm test. UX3-A13 (ux P1): the End row can't land before the start; it moves to the start date (All day) or to
// start + 1 h (timed), the same rule the Start row uses.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const f = await import('../src/features/calendar/calendar-format.ts');
const editor = readFileSync(new URL('../src/features/calendar/event-editor.tsx', import.meta.url), 'utf8');

test('an end at or after the start is kept', () => {
  assert.deepEqual(f.endAfterStart('2026-11-14', '10:00', '2026-11-14', '10:00', false), { end: '2026-11-14', endTime: '10:00' });
  assert.deepEqual(f.endAfterStart('2026-11-14', '10:00', '2026-11-15', '09:00', false), { end: '2026-11-15', endTime: '09:00' });
  assert.deepEqual(f.endAfterStart('2026-11-14', '10:00', '2026-11-14', '08:00', true), { end: '2026-11-14', endTime: '08:00' });
});

test('an end before the start moves: start date when all day, start + 1 h when timed (across midnight too)', () => {
  assert.deepEqual(f.endAfterStart('2026-11-14', '10:00', '2026-11-13', '12:00', true), { end: '2026-11-14', endTime: '12:00' });
  assert.deepEqual(f.endAfterStart('2026-11-14', '10:00', '2026-11-14', '09:00', false), { end: '2026-11-14', endTime: '11:00' });
  assert.deepEqual(f.endAfterStart('2026-11-14', '23:30', '2026-11-14', '22:00', false), { end: '2026-11-15', endTime: '00:30' });
});

test('both rows use the guard', () => {
  assert.equal(editor.match(/endAfterStart\(/g)?.length, 2);
});
