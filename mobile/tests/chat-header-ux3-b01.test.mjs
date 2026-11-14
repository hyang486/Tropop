// Run: npm test. UX3-B01: the chat header's second line.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { headerSubtitle } = await import('../src/lib/chat-plan.ts');
const { en } = await import('../src/i18n/en.ts');
const c = en.chat.header;

test('people · here · ends, "here" dropped at 0', () => {
  assert.equal(headerSubtitle(5, 2, 'today', 'Nov 14', '3:05 PM', c), '5 people · 2 here · ends 3:05 PM');
  assert.equal(headerSubtitle(1, 0, 'today', 'Nov 14', '3:05 PM', c), '1 person · ends 3:05 PM');
  assert.equal(headerSubtitle(3, 0, 'tomorrow', 'Nov 15', '9:00 AM', c), '3 people · ends tomorrow 9:00 AM');
  assert.equal(headerSubtitle(3, 1, 'later', 'Nov 20', '9:00 AM', c), '3 people · 1 here · ends Nov 20');
});
