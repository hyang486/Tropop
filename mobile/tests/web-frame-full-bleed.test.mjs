// Run: npm test. ux P2 (2026-11-15): below 720 px the web demo drops the phone frame and gallery and renders full-bleed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/components/web-frame.web.tsx', import.meta.url), 'utf8');

test('under 720 px the frame returns the bare app, before the frame and panel are built', () => {
  assert.match(src, /const FULL_BLEED_BELOW = 720;/);
  const bare = src.indexOf('width < FULL_BLEED_BELOW');
  assert.ok(bare > 0);
  assert.match(src.slice(bare, bare + 120), /return <View[^>]*>\{children\}<\/View>/);
  assert.ok(bare < src.indexOf('<WebDemoPanel />'));
  assert.ok(bare < src.indexOf('zoom: scale'));
});

test('desktop frame and the 1024 gallery threshold are unchanged', () => {
  assert.match(src, /width >= 1024 \? PANEL_W : 0/);
  assert.match(src, /Math\.max\(0\.6,/);
});
