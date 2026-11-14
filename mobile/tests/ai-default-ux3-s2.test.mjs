// Run: npm test. UX3-A12 / D2: Qrewing AI is on by default for Plus hosts, off for Free, off while loading.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const p = await import('../src/features/event/create-room-plan.ts');

test('default follows the first resolved plan until the host touches the switch', () => {
  assert.equal(p.aiEnabledValue(null, null), false);
  assert.equal(p.aiEnabledValue(null, true), true);
  assert.equal(p.aiEnabledValue(null, false), false);
  assert.equal(p.aiEnabledValue(false, true), false);
  assert.equal(p.aiEnabledValue(true, false), true);
});

test('create-room latches the first resolved plan and cites D2', () => {
  const src = readFileSync(new URL('../src/app/create-room.tsx', import.meta.url), 'utf8');
  assert.match(src, /aiEnabledValue\(pickedAi, firstPlus\)/);
  assert.match(src, /firstPlus === null && plus !== null/);
  assert.match(src, /D2/);
  assert.doesNotMatch(src, /useState\(false\);\s*\n\s*const \[entryRequired/);
});
