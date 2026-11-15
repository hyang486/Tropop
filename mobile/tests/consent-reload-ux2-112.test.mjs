// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const fab = readFileSync(new URL('../src/features/event/qrewing-fab.tsx', import.meta.url), 'utf8');
const sheet = readFileSync(new URL('../src/features/event/disclosure-sheet.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/features/event/qrewing-api.ts', import.meta.url), 'utf8');

test('UX2-112: copy', () => {
  assert.equal(en.qrewing.disclosure.turnOnFailed, "Couldn't turn on Trok AI. Try again.");
});

test('UX2-112: after Agree the sheet stays open (busy) until a fresh room read shows I agreed', () => {
  assert.match(api, /reload\(\): number; readDone: number/);
  assert.match(fab, /const done = confirmFrom !== null && readDone >= confirmFrom;/);
  assert.match(fab, /setConfirmFrom\(reload\(\)\);/);
  assert.match(fab, /const confirmFailed = done && !agreed;/);
  assert.match(fab, /visible=\{consent && !\(done && agreed\)\}/);
  assert.match(fab, /confirming=\{confirmFrom !== null && !done\}/);
  assert.match(fab, /confirmFailed=\{confirmFailed\}/);
});

test('UX2-112: a failed reload keeps the sheet with errorText; Agree is the retry and busy while it runs', () => {
  assert.match(sheet, /confirmFailed \? s\.turnOnFailed : null/);
  assert.match(sheet, /busy=\{busy === 'agree' \|\| confirming\}/);
});

test('UX2-112: stale-read order. A read started before the save never counts; only the post-save seq does', () => {
  // useQrewingRoom: reload() bumps a ref seq and returns it; each read reports its own seq; a newer reload drops
  // the older read (alive=false in the effect cleanup).
  assert.match(api, /seq\.current \+= 1;\s+setTick\(seq\.current\);\s+return seq\.current;/);
  assert.match(api, /if \(alive\) setReadDone\(tick\);/);
  // Model the order: pre-save read seq 1 finishes after the save; the post-save reload is seq 2.
  const done = (confirmFrom, readDone) => confirmFrom !== null && readDone >= confirmFrom;
  assert.equal(done(2, 1), false);
  assert.equal(done(2, 2), true);
});
