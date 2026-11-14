// Run: npm test. UX3 batch 1 (audit-3 part 1): source checks for the screens this batch changes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX3-A03: Welcome shows art, the headline and three value rows, no tagline', () => {
  const w = src('app/welcome.tsx');
  const en = src('i18n/en.ts');
  assert.match(en, /headline: "One room for today's crew"/);
  for (const k of ['valueJoin', 'valuePhotos', 'valueGone']) {
    assert.match(w, new RegExp(`en\\.welcome\\.${k}Title`));
    assert.match(w, new RegExp(`en\\.welcome\\.${k}Line`));
  }
  assert.match(w, /<InkArt art="gathering" width=\{300\} \/>/);
  assert.doesNotMatch(w, /tagline/);
  assert.doesNotMatch(en, /tagline:/);
});
