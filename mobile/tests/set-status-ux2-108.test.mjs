// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const panel = readFileSync(new URL('../src/features/chat/plus-panel.tsx', import.meta.url), 'utf8');
const picker = readFileSync(new URL('../src/components/status-picker.tsx', import.meta.url), 'utf8');

test('UX2-108: Set status is always enabled; the picker shows Emergency first and a loading line for the rest', () => {
  const status = panel.slice(panel.indexOf("key: 'status'"), panel.indexOf('const picker'));
  assert.doesNotMatch(status, /activity\.loading/);
  assert.match(panel, /loading=\{activity\.loading\}/);
  assert.equal(en.activity.statusesLoading, 'Loading statuses…');
  assert.match(picker, /loading && plan\.others\.length === 0 \? <LoadingLine \/>/);
  assert.match(picker, /loadingText: \{[^}]*fontSize: 15[^}]*color: colors\.ink2/);
});

test('UX2-108: Arrived stays disabled while loading but looks it (40% opacity, VoiceOver dimmed)', () => {
  assert.match(panel, /dimmed: activity\.loading && !activity\.myArrivedAt/);
  assert.match(panel, /tile\.dimmed && styles\.dimmed/);
  assert.match(panel, /dimmed: \{ opacity: 0\.4 \}/);
  assert.match(panel, /accessibilityState=\{\{ disabled: !tile\.onPress/);
});
