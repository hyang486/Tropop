// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/features/event/info-section.tsx', import.meta.url), 'utf8');

test('UX2-70: entry questions are read for host and guest of an event room', () => {
  assert.match(src, /useEntryQuestions\(roomType === 'event' \? roomId : ''\)/);
});

test('UX2-70 host: no questions hides the entry switch and its explanation (unless it is on)', () => {
  assert.match(src, /q\.aiEnabled && isEvent && !\(noQuestions && !q\.entryRequired\) \?/);
  assert.doesNotMatch(src, /entryNoQuestions/);
});

test('UX2-70 guest: no questions hides Edit my entry info', () => {
  assert.match(src, /\{noQuestions \? null : \(\s*<QRowCard\s*icon="person\.text\.rectangle"/);
});
