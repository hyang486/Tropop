// Run: npm test. UI v2 bug 7 (qa, 2026-11-13): the Arrived chip was filled black before arriving, so it looked selected.
// Spec 11 A11: Arrived moved from the chat pill row into the "+" panel (src/features/chat/plus-panel.tsx).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/features/chat/plus-panel.tsx', import.meta.url), 'utf8');

test('the Arrived tile fills only after I have arrived, and says so to VoiceOver', () => {
  assert.match(src, /on: !!activity\.myArrivedAt,/);
  assert.doesNotMatch(src, /on: !activity\.myArrivedAt/);
  assert.match(src, /accessibilityState=\{\{ disabled: !tile\.onPress, busy: tile\.busy, selected: tile\.on \}\}/);
});

test('Arrived is one-way: no action once I have arrived', () => {
  assert.match(src, /onPress: activity\.loading \|\| activity\.myArrivedAt \? undefined :/);
});

test('UX2-51: the Set status tile collapses the panel as its picker opens; the picker outlives the grid', () => {
  // The tile opens the picker and collapses the panel in one tap.
  assert.match(src, /setPicking\(true\);\s*onDone\(\);/);
  // Collapsed, the panel renders only the picker, so Cancel/Done land on a collapsed composer with "+".
  assert.match(src, /if \(!open\) return picker;/);
  const screen = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');
  assert.match(screen, /\{userId \? \(\s*<PlusPanel\s+open=\{plusOpen\}/);
});
