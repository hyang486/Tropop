// Run: npm test. Trok Calendar VoiceOver labels and empty states (2026-11-13 a11y pass).
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const f = await import('../src/features/calendar/calendar-format.ts');
const { en } = await import('../src/i18n/en.ts');
const t = en.calendar;

test('diaryText: never blank, at most 3 lines, skips empty or non-string lines', () => {
  assert.deepEqual(f.diaryText(null, t.diaryNone), [t.diaryNone]);
  assert.deepEqual(f.diaryText([], t.diaryNone), [t.diaryNone]);
  assert.deepEqual(f.diaryText(['  ', 3, null], t.diaryNone), [t.diaryNone]);
  assert.deepEqual(f.diaryText(['a', '', 'b', 'c', 'd'], t.diaryNone), ['a', 'b', 'c']);
});

test('ask error names the Add event button, not a bare "+"', () => {
  assert.match(t.askErrors.other, /Add event/);
});

