// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/app/room/[id]/face.tsx', import.meta.url), 'utf8');

test('UX2-69: no disabled Agree before a photo; one filled Choose a photo', () => {
  assert.doesNotMatch(src, /disabled=\{!picked\}/);
  assert.match(src, /\) : \(\s*<Button title=\{en\.face\.pickPhoto\} disabled=\{busy\} onPress=\{openPicker\} \/>/);
});

test('UX2-69: after choosing, Agree and save is primary and Choose another is secondary', () => {
  assert.match(
    src,
    /\{picked \? \(\s*<>\s*<Button title=\{en\.face\.agree\} busy=\{busy\} onPress=\{save\} \/>\s*<Button title=\{en\.face\.chooseAnother\} variant="secondary"/,
  );
});
