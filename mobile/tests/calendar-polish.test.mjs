// Run: npm test. Calendar polish after the 453712d device pass (supervisor + qa, 2026-11-13): (a) one date label,
// (b) "Icon" header, (c) hand-font day list, (d/e) calendar paper behind the screen and header, light and dark.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const editor = read('features/calendar/event-editor.tsx');
const screen = read('features/calendar/calendar-screen.tsx');

test('(a) a date row shows one label: the picker title is spoken only (labelsHidden)', () => {
  const row = editor.slice(editor.indexOf('function DateRow('), editor.indexOf('const styles'));
  assert.match(row, /<DatePicker[\s\S]*?title=\{label\}[\s\S]*?modifiers=\{\[labelsHidden\(\)\]\}/);
  assert.match(row, /<Text[^>]*styles\.dateLabel[^>]*accessibilityElementsHidden/);
});

test('(b) the picker section is called Icon', () => {
  assert.match(read('i18n/en.ts'), /emojiLabel: 'Icon',/);
});

test('(c) superseded by tiers FINAL 2026-11-13 PM: there is no day list under the calendar', () => {
  assert.doesNotMatch(screen, /styles\.(dayList|dayHead|dayTitle|daySub|dayRow)\b/);
});

test('(d/e) UX P2-6: the screens sit on the app paper; the calendar notebook color stays on the grid only', () => {
  for (const [name, src] of [
    ['calendar', screen],
    ['editor', editor],
  ]) {
    assert.doesNotMatch(src, /headerStyle|contentStyle|background=\{/, `${name}: no screen-wide paper override`);
    assert.doesNotMatch(src, /#FBF|#1D1B17/i, name);
  }
  assert.doesNotMatch(editor, /useCalendarColors/);
});

test('(f) UX2-55: the Starts/Ends row labels are SF body 17 regular (hand font is for titles only); the form stays system', () => {
  const ed = read('features/calendar/event-editor.tsx');
  const row = ed.slice(ed.indexOf('function DateRow('), ed.indexOf('const styles'));
  assert.doesNotMatch(row, /fontFamily|handFontFor|useFonts/);
  assert.match(ed, /dateLabel: \{ flex: 1, fontSize: 17, color: colors\.label \}/);
  assert.match(ed, /styles\.emojis, \{ columnGap: colGap \}/);
  const form = ed.slice(ed.indexOf('export function EventEditor'), ed.indexOf('function DateRow('));
  assert.doesNotMatch(form, /fontFamily|handFontFor/);
});
