// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const fab = readFileSync(new URL('../src/features/event/qrewing-fab.tsx', import.meta.url), 'utf8');
const sheet = readFileSync(new URL('../src/features/event/disclosure-sheet.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/features/event/qrewing-api.ts', import.meta.url), 'utf8');

test('UX2-112: copy', () => {
  assert.equal(en.qrewing.disclosure.turnOnFailed, "Couldn't turn on Qrewing AI. Try again.");
});

test('UX2-112: after Agree the sheet stays open (busy) until a fresh room read shows I agreed', () => {
  assert.match(api, /reads: number/);
  assert.match(fab, /const done = confirmFrom !== null && reads > confirmFrom;/);
  assert.match(fab, /const confirmFailed = done && !agreed;/);
  assert.match(fab, /visible=\{consent && !\(done && agreed\)\}/);
  assert.match(fab, /confirming=\{confirmFrom !== null && !done\}/);
  assert.match(fab, /confirmFailed=\{confirmFailed\}/);
});

test('UX2-112: a failed reload keeps the sheet with errorText; Agree is the retry and busy while it runs', () => {
  assert.match(sheet, /confirmFailed \? s\.turnOnFailed : null/);
  assert.match(sheet, /busy=\{busy === 'agree' \|\| confirming\}/);
});
