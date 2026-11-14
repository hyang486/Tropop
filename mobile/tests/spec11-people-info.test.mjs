// Run: npm test. Spec 11 A15/A16 (People to meet) and A18 (Room info status options as a grouped box).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('A15: the People to meet title is in the header, with an avatar left of each name', () => {
  const src = read('features/event/people-screen.tsx');
  assert.match(src, /headerTitle: \(\) => <HandTitle/);
  assert.doesNotMatch(src, /<QScreen\s+title=/);
  assert.ok(src.indexOf('<Avatar path={avatars.get(m.userId)}') < src.indexOf('{m.displayName}</Text>'));
});

test('A16: the empty state has an ink drawing', () => {
  assert.match(read('features/event/people-screen.tsx'), /<EmptyState art="meetup"/);
  assert.match(read('components/empty-state.tsx'), /<InkArt art=\{art\}/);
});

test('A18: read-only status options sit in one grouped box', () => {
  const src = read('components/status-editor.tsx');
  assert.match(src, /<View style=\{styles\.group\}>/);
  assert.match(src, /group: \{ backgroundColor: colors\.field, borderRadius: 12/);
});
