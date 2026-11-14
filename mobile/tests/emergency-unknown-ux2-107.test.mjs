// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';
import { emergencyAreaMode } from '../src/lib/emergency-plan.ts';

test('UX2-107: a stale channel is failed (last list under it); a slow first read is checking, never empty', () => {
  assert.equal(emergencyAreaMode({ loading: true, error: null, count: 0, slow: false }), 'none');
  assert.equal(emergencyAreaMode({ loading: true, error: null, count: 0, slow: true }), 'checking');
  assert.equal(emergencyAreaMode({ loading: false, error: null, count: 0, stale: true }), 'failed');
  assert.equal(emergencyAreaMode({ loading: true, error: null, count: 0, stale: true, slow: true }), 'failed');
  assert.equal(emergencyAreaMode({ loading: false, error: null, count: 1, stale: false, slow: true }), 'list');
  assert.equal(en.activity.offlineStale, "You're offline. Emergencies may not be up to date.");
  assert.equal(en.activity.checking, 'Checking for Emergencies…');
  assert.equal(en.activity.checkingSpoken, 'Checking for Emergencies.');
});

test('UX2-107: the hook marks stale after 5 s without SUBSCRIBED and slow after 3 s of a first read', () => {
  const hook = readFileSync(new URL('../src/lib/activity.ts', import.meta.url), 'utf8');
  assert.match(hook, /setTimeout\(\(\) => setStale\(true\), 5000\)/);
  assert.match(hook, /setTimeout\(\(\) => setSlow\(true\), 3000\)/);
  const ui = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');
  assert.match(ui, /area === 'checking'/);
  assert.match(ui, /en\.activity\.offlineStale/);
  const chat = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');
  // One message, not two: the Emergency row's offline line replaces "Reconnecting…".
  assert.match(chat, /!activity\.stale/);
});
