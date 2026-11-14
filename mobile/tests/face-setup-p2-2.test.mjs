import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const face = readFileSync(new URL('../src/app/room/[id]/face.tsx', import.meta.url), 'utf8');
const en = readFileSync(new URL('../src/i18n/en.ts', import.meta.url), 'utf8');

test('P2-2 setup: "Add a photo of you" before a pick, two short lines, full points (Rekognition) behind Details', () => {
  assert.match(face, /title=\{picked \? en\.face\.reviewTitle : en\.face\.addTitle\}/);
  assert.match(en, /addTitle: 'Add a photo of you'/);
  assert.match(en, /details: 'Details ›'/);
  assert.match(face, /en\.face\.consentShort\.map/);
  assert.match(face, /\{details\s*\? en\.face\.consentPoints\.map/);
  assert.match(en, /Amazon Rekognition/);
});
