// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { matchedPhotoCount } from '../src/lib/face-plan.ts';

test('UX2-68: counts matched photos once, skipping Not me and unmatched', () => {
  assert.equal(matchedPhotoCount([]), 0);
  assert.equal(
    matchedPhotoCount([
      { media_id: 'a', matched: true, excluded: false },
      { media_id: 'a', matched: true, excluded: false },
      { media_id: 'b', matched: true, excluded: true },
      { media_id: 'c', matched: false, excluded: false },
      { media_id: 'd', matched: true, excluded: false },
    ]),
    2,
  );
});

test('UX2-68: Photos of me shows the count row to the Of me filter, or the no-photos line', () => {
  const src = readFileSync(new URL('../src/app/room/[id]/face.tsx', import.meta.url), 'utf8');
  assert.match(src, /matchCount: matchedPhotoCount\(matches\)/);
  assert.match(src, /pathname: '\/room\/\[id\]\/gallery', params: \{ id, filter: 'me' \}/);
  assert.match(src, /<QRowCard icon="face.smiling" title=\{en\.face\.noMatchesYet\} \/>/);
  const en = readFileSync(new URL('../src/i18n/en.ts', import.meta.url), 'utf8');
  assert.match(en, /`\$\{n\} photos of you in this room`/);
  assert.match(en, /noMatchesYet: 'No photos of you yet\.'/);
});
