// Run: npm test. P0 (qa PDF v2, ux-confirmed): a member in Emergency is never dropped from Map's "Sharing now".
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const plan = await import('../src/lib/location-plan.ts');
const { en } = await import('../src/i18n/en.ts');
const map = readFileSync(new URL('../src/app/room/[id]/map.tsx', import.meta.url), 'utf8');

test('P0: the member in Emergency is pinned to the top, with or without a presence row', () => {
  const rows = [{ user_id: 'mina' }, { user_id: 'jun' }, { user_id: 'sora' }];
  assert.deepEqual(
    plan.sharingNowEntries(rows, ['sora']).map((e) => [e.userId, e.emergency, e.row?.user_id ?? null]),
    [['sora', true, 'sora'], ['mina', false, 'mina'], ['jun', false, 'jun']],
  );
  // Her row is gone (a relaunch stops sharing): she still shows, first, with no position.
  assert.deepEqual(
    plan.sharingNowEntries([{ user_id: 'mina' }], ['sora', 'sora']).map((e) => [e.userId, e.emergency, e.row]),
    [['sora', true, null], ['mina', false, { user_id: 'mina' }]],
  );
  assert.deepEqual(plan.sharingNowEntries([], []), []);
});

test('P0: the Emergency row reads "Needs help · <age>" and a stale fix shows its age', () => {
  const now = Date.parse('2026-11-14T10:00:00Z');
  assert.equal(en.map.needsHelp(plan.formatAge('2026-11-14T09:52:00Z', now)), 'Needs help · 8 min ago');
  assert.equal(en.map.needsHelp(null), 'Needs help · Location off');
  assert.equal(en.map.needsHelpSpoken('Sora', null), 'Sora, needs help, location off');
  assert.equal(en.map.needsHelpSpoken('Sora', '2 min ago'), 'Sora, needs help, 2 min ago');
  assert.match(map, /activity\.emergencies\.filter\(\(e\) => e\.userId !== userId\)\.map\(\(e\) => e\.userId\)/);
  assert.match(map, /count: sharingNow\.length/);
  assert.match(map, /en\.map\.needsHelp\(fixAge\)/);
});

test('P0 (ux): I never see my own Emergency row; with sharing off a red line asks me to turn it on', () => {
  assert.equal(en.map.shareInEmergency, 'Turn it on so others can find you.');
  assert.match(map, /const meInEmergency = activity\.emergencies\.some\(\(e\) => e\.userId === userId\);/);
  assert.match(map, /\{meInEmergency && !my\.share \? <Text style=\{styles\.shareEmergency\} importantForAccessibility="no" accessibilityElementsHidden>\{en\.map\.shareInEmergency\}<\/Text> : null\}/);
  // VoiceOver reads the line as the switch's hint (not twice).
  assert.match(map, /accessibilityHint=\{meInEmergency && !my\.share \? en\.map\.shareInEmergency : undefined\}/);
  const sw = readFileSync(new URL('../src/features/event/ink-switch.tsx', import.meta.url), 'utf8');
  assert.match(sw, /accessibilityHint=\{accessibilityHint\}/);
  assert.match(map, /shareEmergency: \{ fontSize: 13, color: colors\.errorText \}/);
});
