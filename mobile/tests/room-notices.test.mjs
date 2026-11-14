// Run: npm test. Spec 11 A9 room notices store (bell): idempotent upsert, unread count, clearing.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const n = await import('../src/lib/room-notices.ts');
const q = (id, roomId = 'r1', createdAt = 1) => ({ id, roomId, kind: 'question', title: 'New question', createdAt });

test('upsert is idempotent by id; identical upsert keeps the same snapshot', () => {
  n.clearAllNotices();
  n.upsertNotice(q('question:a'));
  const s1 = n.roomNotices('r1');
  n.upsertNotice(q('question:a'));
  assert.equal(n.roomNotices('r1'), s1);
  assert.equal(s1.notices.length, 1);
  n.upsertNotice({ ...q('question:a'), title: 'Changed' });
  assert.equal(n.roomNotices('r1').notices[0].title, 'Changed');
  assert.equal(n.roomNotices('r1').notices.length, 1);
});

test('unread counts until the room is marked read; a new notice is unread again; newest first', () => {
  n.clearAllNotices();
  n.upsertNotice(q('question:a', 'r1', 1));
  n.upsertNotice(q('question:b', 'r1', 2));
  n.upsertNotice(q('question:c', 'r2', 3));
  assert.equal(n.roomNotices('r1').unread, 2);
  assert.deepEqual(n.roomNotices('r1').notices.map((x) => x.id), ['question:b', 'question:a']);
  n.markRoomNoticesRead('r1');
  assert.equal(n.roomNotices('r1').unread, 0);
  assert.equal(n.roomNotices('r2').unread, 1);
  n.upsertNotice(q('question:d', 'r1', 4));
  assert.equal(n.roomNotices('r1').unread, 1);
});

test('remove, clear a room, clear all', () => {
  n.clearAllNotices();
  n.upsertNotice(q('question:a', 'r1'));
  n.upsertNotice(q('question:b', 'r2'));
  n.removeNotice('question:a');
  assert.equal(n.roomNotices('r1').notices.length, 0);
  n.clearRoomNotices('r2');
  assert.equal(n.roomNotices('r2').notices.length, 0);
  n.upsertNotice(q('question:c', 'r1'));
  n.clearAllNotices();
  assert.equal(n.roomNotices('r1').unread, 0);
});

test('store makes no server calls and sign-out clears it', () => {
  const src = readFileSync(new URL('../src/lib/room-notices.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /supabase|fetch\(/);
  assert.match(src, /useSyncExternalStore/);
  const auth = readFileSync(new URL('../src/lib/auth.tsx', import.meta.url), 'utf8');
  assert.equal(auth.match(/clearAllNotices\(\);/g)?.length, 3);
});
