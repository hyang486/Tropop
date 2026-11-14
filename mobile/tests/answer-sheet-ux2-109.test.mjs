// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const sheet = readFileSync(new URL('../src/features/questions/answer-sheet.tsx', import.meta.url), 'utf8');

test('UX2-109: copy for the loading, failed and gone states (VoiceOver drops the ellipsis)', () => {
  assert.equal(en.questions.answerLoading, 'Loading the answer…');
  assert.equal(en.questions.answerLoadingSpoken, 'Loading the answer.');
  assert.equal(en.questions.answerFailed, "Couldn't load the answer.");
  assert.equal(en.questions.answerGone, 'This question is gone.');
});

test('UX2-109: the sheet opens on cardId, not on a loaded card, so a tap is never dead and close clears it', () => {
  assert.match(sheet, /visible=\{!!cardId\}/);
  assert.doesNotMatch(sheet, /visible=\{!!card\}/);
  assert.match(sheet, /useDismissOnLink\(cardId \? onClose : null\)/);
});

test('UX2-109: no answered card yet → reload; then loading, failed (Try again) or gone', () => {
  assert.match(sheet, /loadCards\(roomId\)/);
  assert.match(sheet, /<ActivityIndicator/);
  assert.match(sheet, /s\.answerFailed/);
  assert.match(sheet, /s\.tryAgain/);
  assert.match(sheet, /s\.answerGone/);
  // See Plus only shows next to an answer.
  assert.match(sheet, /card \? \(\s*<>/);
});
