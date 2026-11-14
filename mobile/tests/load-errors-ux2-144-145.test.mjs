import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-144: room first-load error is an "ended" EmptyState with Try again; no raw error text', () => {
  const c = src('app/room/[id]/index.tsx');
  const block = c.slice(c.indexOf("if (state.status === 'error') {"), c.indexOf('return (\n    <ChatRoom'));
  assert.match(block, /<EmptyState\s+art="ended"\s+title=\{en\.room\.openFailedTitle\}\s+body=\{en\.room\.openFailedBody\}\s+action=\{\{ title: en\.home\.retry, onPress: load \}\}/);
  assert.doesNotMatch(block, /state\.message|<Hint/);
  const e = src('i18n/en.ts');
  assert.match(e, /openFailedTitle: "Couldn't open this room",/);
  assert.match(e, /openFailedBody: 'Check your connection and try again\.',/);
  assert.match(e, /\n    retry: 'Try again',/);
});

test('UX2-145: a failed refresh with items listed shows one 15 pt ink2 line above the grid, cleared on success', () => {
  const g = src('app/room/[id]/gallery.tsx');
  assert.match(g, /const refreshFailed = !!media\.error && media\.items\.length > 0;/);
  assert.match(g, /\|\| refreshFailed \? \(/);
  assert.match(g, /\{refreshFailed \? <Text style=\{styles\.refreshFailed\}>\{en\.media\.refreshFailed\}<\/Text> : null\}\n      <\/View>/);
  assert.match(g, /refreshFailed: \{ fontSize: 15, color: colors\.ink2 \},/);
  assert.match(g, /ListHeaderComponent=\{notices \?\? undefined\}/);
  assert.match(src('i18n/en.ts'), /refreshFailed: "Couldn't refresh\. Pull to try again\.",/);
  // The next successful load clears the error.
  assert.match(src('lib/media.ts'), /setItems\(outcome\.data\);\n\s+setError\(null\);/);
});
