// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');

test('C37 (UX2-126): location line copy', () => {
  assert.equal(en.activity.openLastLocationAge('2 min ago'), 'Open last location · 2 min ago');
  assert.equal(en.activity.yourLastLocation('2 min ago'), 'Your last location · 2 min ago');
  assert.equal(en.activity.noLocation, 'No location shared');
});

test('C37 (UX2-126): a third 1-line text line under barMeta; the icon left the meta row', () => {
  assert.doesNotMatch(src, /barMetaRow/);
  assert.match(src, /<Text style=\{styles\.barMeta\} numberOfLines=\{2\}/);
  assert.match(src, /style=\{\[styles\.barLocation, canOpenLocation && \[styles\.barLocationOpen, styles\.barLocationLink\]\]\}\s*numberOfLines=\{1\}/);
  assert.match(src, /barLocation: \{[^}]*fontSize: 13[^}]*color: colors\.ink2/);
  assert.match(src, /barLocationOpen: \{[^}]*fontWeight: '600'[^}]*color: colors\.label/);
  assert.match(src, /canOpenLocation \? <SymbolView name="location\.fill" size=\{11\}/);
});
