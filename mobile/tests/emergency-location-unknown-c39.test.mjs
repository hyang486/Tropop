// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';
import { locationLineState } from '../src/lib/emergency-plan.ts';

const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');

test('C39: copy (VoiceOver drops the ellipsis)', () => {
  assert.equal(en.activity.checkingLocation, 'Checking location…');
  assert.equal(en.activity.checkingLocationSpoken, 'Checking location.');
  assert.equal(en.activity.locationFailed, "Couldn't check location");
  assert.equal(en.activity.locationFailedSpoken, "Couldn't check location.");
  assert.equal(en.activity.locationRetryHint, 'Double-tap to try again.');
});

test('C39: "No location shared" only after a read that worked', () => {
  const s = (o) => locationLineState({ shared: false, loaded: false, error: false, late: false, ...o });
  assert.equal(s({ shared: true }), 'shared');
  assert.equal(s({ shared: true, error: true }), 'shared');
  assert.equal(s({ loaded: true }), 'none');
  assert.equal(s({ loaded: true, error: true }), 'failed');
  assert.equal(s({ error: true }), 'failed');
  assert.equal(s({}), 'blank');
  assert.equal(s({ late: true }), 'checking');
});

test('C39: failed line is ink2 with a semibold label "Try again"; the text block retries, busy while it runs', () => {
  assert.match(src, /<Text style=\{styles\.barLocationOpen\}>\{en\.activity\.locationRetry\}<\/Text>/);
  assert.match(src, /lineState === 'failed' \? \(\) => retryPresence\(\)/);
  assert.match(src, /accessibilityState=\{\{ busy: lineState === 'failed' && presenceRetrying \}\}/);
  // Blank first second keeps the line's height.
  assert.match(src, /lineState === 'blank'\s*\?\s*' '/);
  assert.match(src, /setTimeout\(\(\) => setPresenceLate\(true\), 1000\)/);
});
