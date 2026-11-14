// Run: npm test. The calendar's floating Q keeps QScreen's clearance; chat and the other room screens no longer
// have a floating or header Q (UX3-B05, S5).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const size = read('features/event/qrewing-fab-size.ts');
const fab = read('features/event/qrewing-fab.tsx');
const qscreen = read('components/q-screen.tsx');
const chat = read('app/room/[id]/index.tsx');
const info = read('app/room/[id]/info.tsx');
const gallery = read('app/room/[id]/gallery.tsx');
const photosOfMe = read('components/photos-of-me.tsx');
const map = read('app/room/[id]/map.tsx');
const people = read('features/event/people-screen.tsx');

// UX3-B05 (S5): the chat FAB and the header icons were removed; see composer-qrewing-ux3-s5.test.mjs.
test('room over: map and info clear the header icon', () => {
  for (const src of [info, map]) assert.match(src, /headerRight: \(\) => null/);
});

test('QScreen floating slot keeps its own clearance (calendar Q unchanged)', () => {
  assert.match(qscreen, /floatingClear: \{ paddingBottom: QSCREEN_FLOATING_CLEARANCE \}/);
  assert.match(size, /QSCREEN_FLOATING_CLEARANCE = 12 \+ 56 \+ 12;/);
});
