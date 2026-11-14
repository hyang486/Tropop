// Run: npm test. UX2-43: default avatar glyphs draw as ink text, never as a color emoji.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_AVATARS } from '../src/lib/default-avatars.ts';

test('UX2-43: the sun glyph asks for text presentation (U+FE0E)', () => {
  const sun = DEFAULT_AVATARS.find((a) => a.key === 'sun');
  assert.equal(sun?.glyph, '☀︎');
});

test('UX2-43: no glyph uses emoji presentation (U+FE0F)', () => {
  for (const a of DEFAULT_AVATARS) assert.ok(!a.glyph.includes('️'), a.key);
});
