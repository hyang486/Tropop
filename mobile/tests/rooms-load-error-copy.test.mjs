// Run: npm test. ux P2: the Rooms list load error is the plain line, never the raw error text.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const rooms = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

test('Rooms load error: plain "Could not load your rooms." and the offline branch kept', () => {
  assert.match(rooms, /setError\(en\.home\.loadFailed\);\s*setOffline\(errorKind\(e\) === 'offline'\);/);
  assert.doesNotMatch(rooms, /errorMessage\(/);
});
