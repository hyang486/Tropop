// Run: npm test (node --test, Node 24 strips the .ts types).
// qa: "Open last location" can't be reached on device unless the sender is sharing, so this pins it with fixed data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';
import { locationLineState, spokenSeparators } from '../src/lib/emergency-plan.ts';
import { formatAge } from '../src/lib/location-plan.ts';

const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-14T12:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();

test('C39 open: a shared row wins over loading, failed and late', () => {
  for (const o of [{}, { loaded: true }, { error: true }, { late: true }, { loaded: true, error: true, late: true }]) {
    assert.equal(locationLineState({ shared: true, loaded: false, error: false, late: false, ...o }), 'shared');
  }
});

test('C39 open: visible line, VoiceOver label and hint for fixed ages', () => {
  const cases = [
    [ago(20_000), 'just now'],
    [ago(2 * 60_000 + 5_000), '2 min ago'],
    [ago(59 * 60_000), '59 min ago'],
    [ago(65 * 60_000), '1 h ago'],
  ];
  for (const [at, age] of cases) {
    assert.equal(formatAge(at, NOW), age);
    assert.equal(en.activity.openLastLocationAge(formatAge(at, NOW)), `Open last location · ${age}`);
    assert.equal(en.activity.yourLastLocation(formatAge(at, NOW)), `Your last location · ${age}`);
    const spoken = spokenSeparators(en.activity.lastLocation(formatAge(at, NOW)));
    assert.ok(!spoken.includes('·'), spoken);
    assert.ok(spoken.includes(age), spoken);
    assert.equal(en.activity.locationHint(age), `Opens the last shared location, ${age}`);
  }
});

test('C39 open: future timestamps read "just now"; a bad timestamp reads "unknown"', () => {
  assert.equal(formatAge(new Date(NOW + 60_000).toISOString(), NOW), 'just now');
  assert.equal(formatAge('not a date', NOW), 'unknown');
});

test('C39 open: only someone else\'s shared Emergency opens the Map at the sender', () => {
  assert.match(src, /const canOpenLocation = !mine && location\.kind === 'shared';/);
  assert.match(src, /canOpenLocation\s*\?\s*\(\) => openLocation\(e\.userId, location\.coordinates\)/);
  assert.match(src, /pathname: '\/room\/\[id\]\/map', params: \{ id: roomId, focus: senderId \}/);
  assert.match(src, /accessibilityRole=\{canOpenLocation \|\| canRetry \? 'button' : 'text'\}/);
  assert.match(src, /canOpenLocation\s*\?\s*en\.activity\.locationHint\(formatAge\(location\.updatedAt, now\)\)/);
  // Open style + pin icon only when it opens; your own shows "Your last location" with no link styling.
  assert.match(src, /\{canOpenLocation \? <SymbolView name="location\.fill"/);
  assert.match(src, /styles\.barLocation, canOpenLocation && \[styles\.barLocationOpen, styles\.barLocationLink\]/);
  assert.match(src, /mine \? \(\s*en\.activity\.yourLastLocation\(formatAge\(location\.updatedAt, now\)\)\s*\) : \(\s*en\.activity\.openLastLocationAge/);
});
