// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');

test('UX2-77: Emergency bar subtitle wraps to 2 lines; the pill stays centered on the bar', () => {
  assert.match(src, /<Text style=\{styles\.barMeta\} numberOfLines=\{2\}/);
  assert.match(src, /bar: \{\s*flexDirection: 'row',\s*alignItems: 'center',/);
  assert.match(src, /barMetaRow: \{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 \}/);
});
