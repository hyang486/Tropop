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
