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

test('UX2-82: the recap card shows pattern E on a failed read instead of swallowing it', () => {
  const card = readFileSync(new URL('../src/features/recap/recap-card.tsx', import.meta.url), 'utf8');
  assert.equal(en.qrewing.recap.loadFailed, "Couldn't load the recap.");
  assert.equal(en.qrewing.recap.loadOffline, "You're offline. Try again when you're back.");
  assert.doesNotMatch(card, /\.catch\(\(\) => \{\}\)/);
  assert.match(card, /setFailed\(\{ roomId, offline: errorKind\(e\) === 'offline' \}\)/);
  assert.match(card, /failed\.offline \? s\.loadOffline : s\.loadFailed/);
  assert.match(card, /retry: \{[^}]*minHeight: 36,[^}]*backgroundColor: colors\.wash/);
  assert.match(card, /hitSlop=\{4\}/);
  assert.match(card, /accessibilityState=\{\{ disabled: retrying, busy: retrying \}\}/);
});

test('UX2-83: the gallery title is always "Photos & files"; an ended read shows Room ended, a network failure keeps the grid', () => {
  assert.match(gallery, /<HandTitle style=\{styles\.title\}>\{en\.media\.title\}<\/HandTitle>/);
  assert.equal(en.media.title, 'Photos & files');
  assert.match(gallery, /if \(errorKind\(e\) === 'ended'\) setGone\(true\);/);
});

test('UX2-84: the video badge uses the fixed photoScrim / onPhotoScrim tokens; the themed scrim is unchanged', () => {
  const ui = readFileSync(new URL('../src/components/ui.tsx', import.meta.url), 'utf8');
  assert.match(ui, /photoScrim: 'rgba\(0,0,0,0\.55\)',/);
  assert.match(ui, /onPhotoScrim: '#FFFFFF',/);
  assert.match(ui, /scrim: themed\('scrim'\),/);
  assert.match(gallery, /tintColor=\{colors\.onPhotoScrim\}/);
  assert.match(gallery, /backgroundColor: colors\.photoScrim,/);
  assert.doesNotMatch(gallery, /rgba\(0,0,0,0\.55\)|tintColor="white"/);
});
