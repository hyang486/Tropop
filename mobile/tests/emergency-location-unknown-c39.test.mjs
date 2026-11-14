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

test('C39 Map: the bar uses the Emergency presence source, enabled by an open Emergency, not by the activity', () => {
  const map = readFileSync(new URL('../src/app/room/[id]/map.tsx', import.meta.url), 'utf8');
  assert.match(map, /const emergencyPresence = useEmergencyPresence\(room\.id, activity\);/);
  assert.match(map, /<EmergencyAlerts[\s\S]*?presence=\{emergencyPresence\}/);
  assert.doesNotMatch(map, /presence=\{presence\.rows\}/);
  assert.match(src, /useLivePresence\(roomId, activity\.emergencies\.length > 0\)/);
  const loc = readFileSync(new URL('../src/lib/location.ts', import.meta.url), 'utf8');
  // Once enabled, a read that works sets loaded (and a failed one sets error), so the line leaves blank/checking.
  assert.match(loc, /setError\(!!failed\);\s+if \(failed\) return;\s+setRows\(data \?\? \[\]\);\s+setLoaded\(true\);/);
  // Emergency open, no activity running: presence enabled, the read lands with no row for the sender.
  assert.equal(locationLineState({ shared: false, loaded: false, error: false, late: true }), 'checking');
  assert.equal(locationLineState({ shared: false, loaded: true, error: false, late: true }), 'none');
  assert.equal(locationLineState({ shared: false, loaded: false, error: true, late: true }), 'failed');
});

test('C39 VO: the location part runs through spokenSeparators; own Emergency speaks "Your last location"', async () => {
  const { spokenSeparators } = await import('../src/lib/emergency-plan.ts');
  assert.match(src, /spokenSeparators\(\s*mine\s*\? en\.activity\.yourLastLocation\(formatAge\(location\.updatedAt, now\)\)\s*: en\.activity\.lastLocation\(/);
  assert.equal(spokenSeparators(en.activity.lastLocation('just now')), 'Last location shared, just now');
  assert.equal(spokenSeparators(en.activity.yourLastLocation('just now')), 'Your last location, just now');
});
