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

test('fix 2: the map catches up on the room after a reconnect and on return to foreground', () => {
  const map = read('app/room/[id]/map.tsx');
  assert.match(map, /\(status\) => \{\n\s+if \(status === 'SUBSCRIBED'\) load\(\);/);
  assert.match(map, /AppState\.addEventListener\('change', \(next\) => \{\n\s+if \(next === 'active'\) load\(\);/);
});

test('fix 3: location access granted in Settings clears the denied hint when the app comes back', () => {
  const map = read('app/room/[id]/map.tsx');
  assert.match(map, /if \(ok\) \{\n\s+setAskDenied\(false\);\n\s+setLocate\(\(l\) => \(l === 'denied' \|\| l === 'settings' \? 'idle' : l\)\);/);
  assert.match(map, /if \(next === 'active'\) check\(\);/);
});

test('fix 4: a failed location watch start is retried with a capped backoff while the row says Retrying', async () => {
  const { watchRetryDelayMs } = await import('../src/lib/location-plan.ts');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 20].map(watchRetryDelayMs), [2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
  assert.equal(watchRetryDelayMs(-1), 2000);
  const loc = read('lib/location.ts');
  assert.match(loc, /retry = setTimeout\(\(\) => void startWatch\(\), watchRetryDelayMs\(watchAttempt\+\+\)\)/);
  assert.match(loc, /if \(retry\) clearTimeout\(retry\);/);
});

test('fix 5: a room that ended stops its uploads; failed rows stay only through the grace window', async () => {
  const { withoutRoomJobs } = await import('../src/lib/upload-plan.ts');
  const jobs = [
    { id: 'a', roomId: 'r1', state: 'uploading', progress: 0.4 },
    { id: 'b', roomId: 'r1', state: 'queued', progress: 0 },
    { id: 'c', roomId: 'r1', state: 'failed', progress: 0 },
    { id: 'd', roomId: 'r2', state: 'queued', progress: 0 },
  ];
  assert.deepEqual(withoutRoomJobs(jobs, 'r1', true).map((j) => j.id), ['c', 'd']);
  assert.deepEqual(withoutRoomJobs(jobs, 'r1', false).map((j) => j.id), ['d']);
  assert.equal(withoutRoomJobs(jobs, 'r3', false), jobs);
  const media = read('lib/media.ts');
  assert.match(media, /export function stopRoomUploads\(roomId: string, keepFailed: boolean\)/);
  assert.match(media, /controllers\.get\(j\.id\)\?\.abort\(\)/);
  assert.match(media, /if \(errorKind\(e\) === 'ended'\) setJobs/);
  const gallery = read('app/room/[id]/gallery.tsx');
  assert.match(gallery, /if \(over\) stopRoomUploads\(id, keepFailed\);/);
});
