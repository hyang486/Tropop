// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

test('UX2-71: Photo viewer reads "Shared by Jun · 11 h ago"', () => {
  assert.equal(en.media.sharedByAge('Jun', en.media.ageAgo(11, 'hr')), 'Shared by Jun · 11 h ago');
  assert.equal(en.media.ageAgo(5, 'min'), '5 min ago');
  assert.equal(en.media.ageAgo(1, 'day'), '1 day ago');
  assert.equal(en.media.ageAgo(18, 'sec'), '18 sec ago');
  const viewer = readFileSync(new URL('../src/app/room/[id]/media/[mediaId].tsx', import.meta.url), 'utf8');
  assert.match(viewer, /en\.media\.sharedByAge\(uploader, en\.media\.ageAgo\(age\.n, age\.unit\)\)/);
});
