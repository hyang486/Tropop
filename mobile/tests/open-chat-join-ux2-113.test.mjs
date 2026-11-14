// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/features/event/open-chat-section.tsx', import.meta.url), 'utf8');

test('UX2-113: while joining, the count is a 20 pt spinner and the other rows dim to 50%', () => {
  // iOS "small" ActivityIndicator is 20 pt.
  assert.match(src, /joining === room\.room_id \? \(\s*<ActivityIndicator size="small"/);
  assert.match(src, /joining !== null && joining !== room\.room_id && styles\.dimmed/);
  assert.match(src, /dimmed: \{ opacity: 0\.5 \}/);
});
