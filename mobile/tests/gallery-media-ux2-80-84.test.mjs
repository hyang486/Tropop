// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const gallery = readFileSync(new URL('../src/app/room/[id]/gallery.tsx', import.meta.url), 'utf8');

test('UX2-80: a failed tile preview shows a field square with the photo icon and stays tappable', () => {
  assert.equal(en.media.previewUnavailable('Photo by Mina'), 'Photo by Mina, preview unavailable');
  const tile = gallery.slice(gallery.indexOf('function Tile('), gallery.indexOf('function UploadRow('));
  assert.match(tile, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(tile, /<SymbolView name="photo" size=\{24\} tintColor=\{colors\.ink2\} \/>/);
  assert.match(tile, /<Link [\s\S]*?asChild>\s*<Pressable/);
  assert.match(gallery, /failedTile: \{[^}]*backgroundColor: colors\.field/);
});

test('UX2-81: a failed reference photo keeps the box, shows the person icon, a line and Try again (44 pt)', () => {
  const face = readFileSync(new URL('../src/app/room/[id]/face.tsx', import.meta.url), 'utf8');
  assert.equal(en.face.referenceFailed, "Couldn't load your face photo.");
  assert.match(face, /onError=\{\(\) => setRefFailed\(true\)\}/);
  assert.match(face, /<SymbolView name="person" size=\{32\} tintColor=\{colors\.ink2\} \/>/);
  assert.match(face, /key=\{refTry\}/);
  assert.match(face, /refRetry: \{ minHeight: 44/);
  assert.match(face, /refFailedText: \{ fontSize: 15, color: colors\.ink2/);
});
