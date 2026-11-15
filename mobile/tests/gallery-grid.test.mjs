// Run: npm test. Web bug (qa/ux 2026-11-15): tiles were sized from the browser window, not the phone frame.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { galleryTileSize, nextGalleryWidth } from '../src/lib/gallery-grid.ts';

test('3 columns, side 16, gap 2: phone frame vs a wide browser window', () => {
  assert.equal(galleryTileSize(402, 16, 2, 3), 122); // (402 - 32 - 4) / 3
  assert.equal(galleryTileSize(393, 16, 2, 3), 119);
  assert.equal(galleryTileSize(1280, 16, 2, 3), 414); // the old web bug: one tile ~ the whole frame
});

test('measured width: keep the previous on 0, round sub-pixels', () => {
  assert.equal(nextGalleryWidth(390, 0), 390);
  assert.equal(nextGalleryWidth(390, 401.6), 402);
  assert.equal(nextGalleryWidth(390, 402), 402);
});

test('gallery seeds from the window width and then follows the container', () => {
  const src = readFileSync(new URL('../src/app/room/[id]/gallery.tsx', import.meta.url), 'utf8');
  assert.match(src, /useState\(useWindowDimensions\(\)\.width\)/);
  assert.match(src, /setWidth\(\(w\) => nextGalleryWidth\(w, e\.nativeEvent\.layout\.width\)\)/);
  assert.match(src, /galleryTileSize\(width, qSpacing\.side, GAP, COLUMNS\)/);
});
