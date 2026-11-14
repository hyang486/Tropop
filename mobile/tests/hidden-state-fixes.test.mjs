// Run: npm test. Hidden-state sweep fixes (2026-11-14, supervisor triage 1-8).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('fix 1: the map re-reads the room after a host change succeeds, not only on a realtime notice', () => {
  const map = read('app/room/[id]/map.tsx');
  assert.match(map, /await action\(\);\n\s+if \(refresh\) reload\(\);/);
  assert.match(map, /run\('allowed', \(\) => setLocationAllowed\(room\.id, true\), true\)/);
  assert.match(map, /run\('allowed', \(\) => setLocationAllowed\(room\.id, false\), true\)/);
  assert.match(map, /run\('activity', \(\) => setActivityState\(room\.id, 'active'\), true\)/);
  assert.match(map, /setEditor\(null\);\n\s+\}, true\);/);
  assert.match(map, /reload=\{load\}/);
});
