// Run: npm test. UX P0-2: the floating Ask Qrewing button shows only in chat (calendar has its own), 12 pt above
// the composer and 16 pt from the trailing edge, with the chat list padded by 64 pt; map, info, photos and People
// to meet show it as a 44 pt header icon instead.
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

test('footprint: 12 pt gap + 52 pt button = 64 pt chat clearance; no imports in the size file', () => {
  assert.match(size, /QREWING_FAB_MARGIN = 12;/);
  assert.match(size, /QREWING_FAB_SIZE = 52;/);
  assert.match(size, /QREWING_FAB_CLEARANCE = QREWING_FAB_MARGIN \+ QREWING_FAB_SIZE;/);
  assert.doesNotMatch(size, /^import /m);
  assert.match(fab, /bottom: QREWING_FAB_MARGIN, right: insets\.right \+ 16/);
});

test('floating Q only in chat, padded by the clearance', () => {
  assert.match(chat, /<QrewingFab ask=\{ask\} \/>/);
  assert.match(chat, /paddingTop: QREWING_FAB_CLEARANCE/);
  // UX2-04: one probe for the FAB and the "answered your question" notice, which checks the plan like the FAB.
  assert.match(chat, /const ask = useQrewingAskButton\(room\.id\);/);
  assert.match(chat, /if \(ask\.available\) ask\.open\(\);/);
  assert.equal(chat.match(/useQrewingAskButton\(/g).length, 1);
  for (const src of [info, gallery, map, people, photosOfMe]) {
    assert.doesNotMatch(src, /<QrewingFab\b/);
    assert.doesNotMatch(src, /QREWING_FAB_CLEARANCE/);
  }
});

test('header icon on map, info, photos and People to meet, only when available', () => {
  for (const src of [info, gallery, map, people]) {
    assert.match(src, /useQrewingAskButton\(/);
    assert.match(src, /ask\.available \? <QrewingHeaderButton onPress=\{ask\.open\} \/> : null/);
    assert.match(src, /ask\.sheet/);
  }
  assert.match(fab, /headerButton: \{ width: 44, height: 44/);
  assert.match(fab, /mark: \{ width: 22, height: 22 \}/);
});

test('room over: map and info clear the header icon', () => {
  for (const src of [info, map]) assert.match(src, /headerRight: \(\) => null/);
});

test('QScreen floating slot keeps its own clearance (calendar Q unchanged)', () => {
  assert.match(qscreen, /floatingClear: \{ paddingBottom: QSCREEN_FLOATING_CLEARANCE \}/);
  assert.match(size, /QSCREEN_FLOATING_CLEARANCE = 12 \+ 56 \+ 12;/);
});
