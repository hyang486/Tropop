import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (f) => readFileSync(new URL(`../src/features/calendar/day/${f}`, import.meta.url), 'utf8');
const dd = read('day-detail.tsx');
const recap = read('recap-card.tsx');

test('recap: Free (upsell) never renders diary text; unread plan renders nothing', () => {
  assert.match(recap, /state === 'wait'\) return null/);
  assert.match(recap, /state === 'ready' \? \(\s*<View style=\{styles.row\}>/);
  assert.match(recap, /slice\(0, 3\)/);
});

test('day detail: ended room is not a button, Add next only for ended rooms, empty day links with date', () => {
  assert.match(dd, /live \? \(\s*<Pressable/);
  assert.match(dd, /!live \? \(\s*<AddNext/);
  assert.match(dd, /params: \{ date \}/);
  assert.match(dd, /params: addNextParams\(r, r\.emoji\)/);
  assert.doesNotMatch(dd, /ask: '1'/);
});
