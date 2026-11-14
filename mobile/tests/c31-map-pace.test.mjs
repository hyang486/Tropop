// Run: npm test. ux C31 (map, pace, calendar): docs/evidence/ux/audit-2-2026-11-14.md.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const plan = await import('../src/lib/location-plan.ts');
const { en } = await import('../src/i18n/en.ts');
const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-85: "Sharing now" is loading until a read works, error on a failed read, empty only after a good read', () => {
  const v = plan.presenceView;
  assert.equal(v({ loaded: false, error: false, count: 0 }), 'loading');
  assert.equal(v({ loaded: false, error: true, count: 0 }), 'error');
  assert.equal(v({ loaded: true, error: true, count: 0 }), 'error');
  assert.equal(v({ loaded: true, error: false, count: 0 }), 'empty');
  // Rows already on screen stay (a later failed refetch does not blank them).
  assert.equal(v({ loaded: true, error: true, count: 2 }), 'rows');
  assert.equal(v({ loaded: true, error: false, count: 1 }), 'rows');
  assert.equal(en.map.presenceLoading, 'Checking who’s sharing…');
  assert.equal(en.map.presenceFailed, 'Couldn’t load who’s sharing.');
  const loc = src('lib/location.ts');
  assert.match(loc, /return \{ rows: enabled \? rows : EMPTY_PRESENCE, loaded, error, reload \};/);
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /presenceView\(\{ loaded: presence\.loaded, error: presence\.error, count: presence\.rows\.length \}\)/);
  assert.match(map, /<Hint>\{en\.map\.nobody\}<\/Hint>/);
  assert.match(map, /title=\{en\.map\.tryAgain\}/);
});

test('UX2-117: a failed refetch keeps rows and adds one stale line with Try again', () => {
  assert.equal(en.map.presenceStale, 'Couldn’t refresh. Showing the last update.');
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /presenceState === 'rows' && presence\.error \? <Hint>\{en\.map\.presenceStale\}<\/Hint>/);
});
