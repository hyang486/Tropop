// Run: npm test. ux P2: the Rooms list load error is the plain line, never the raw error text.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const rooms = readFileSync(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8');

// Tab bar: Open chat moved to Explore, so Today no longer tracks offline for it.
test('Rooms load error: plain "Could not load your rooms."', () => {
  assert.match(rooms, /catch \{\s*setError\(en\.home\.loadFailed\);\s*\}/);
  assert.doesNotMatch(rooms, /errorMessage\(/);
});
