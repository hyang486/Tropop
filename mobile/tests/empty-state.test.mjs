// Run: npm test. UX §3 EmptyState: one shared look for empty and failed lists.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('EmptyState is a 17 pt semibold title and a 15 pt ink2 line', () => {
  const src = read('components/empty-state.tsx');
  assert.match(src, /title: \{ fontSize: 17, fontWeight: '600', color: colors\.label/);
  assert.match(src, /body: \{ fontSize: 15, color: colors\.ink2/);
});

test('People and room chat use the shared EmptyState, with no local copy', () => {
  const people = read('features/event/people-screen.tsx');
  const chat = read('app/room/[id]/index.tsx');
  assert.doesNotMatch(people, /function EmptyState/);
  assert.match(chat, /<EmptyState art="gathering"/);
  assert.match(chat, /<EmptyState title=\{en\.chat\.loadError\} action=/);
});

test('Rooms, Photos and entry use the shared EmptyState with existing ink art', () => {
  // UX3-A02: Rooms' empty layout is the gathering art and one line above the buttons (no EmptyState title).
  assert.match(read('app/index.tsx'), /<InkArt art="gathering" width=\{240\} \/>\n\s+<Text style=\{styles\.emptyLine\}>\{en\.home\.emptyLine\}/);
  const gallery = read('app/room/[id]/gallery.tsx');
  assert.match(gallery, /<EmptyState art="camera" title=\{emptyText\} body=\{en\.media\.emptyHint\} \/>/);
  assert.match(gallery, /<EmptyState title=\{en\.media\.loadError\} action=\{\{ title: en\.home\.retry, onPress: media\.reload \}\} \/>/);
  assert.match(read('features/event/entry-screen.tsx'), /<EmptyState art="paper" title=\{s\.noQuestions\} body=\{s\.noQuestionsBody\} \/>/);
});
