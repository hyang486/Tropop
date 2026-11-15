// Run: npm test. F-EM-EXP: an ended room has its own cause, never the network error.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { roomHasEnded, sendFailure } from '../src/lib/error-kind.ts';

const NOW = Date.parse('2026-11-14T12:00:00Z');
const open = { deleted_at: null, expires_at: '2026-11-14T13:00:00Z' };
const expired = { deleted_at: null, expires_at: '2026-11-14T11:00:00Z' };
const hostEnded = { deleted_at: '2026-11-14T11:30:00Z', expires_at: '2026-11-14T13:00:00Z' };

test('roomHasEnded: expires_at passed or host ended', () => {
  assert.equal(roomHasEnded(open, NOW), false);
  assert.equal(roomHasEnded(expired, NOW), true);
  assert.equal(roomHasEnded(hostEnded, NOW), true);
  assert.equal(roomHasEnded(null, NOW), false);
});

test('server ended codes are ended, even when the client row is still open', () => {
  assert.equal(sendFailure({ code: 'P0002', message: 'This room has ended.' }, open, NOW), 'ended');
  assert.equal(sendFailure({ code: '42501', message: 'Not a member of an open room' }, open, NOW), 'ended');
});

test('RLS and "not a member of this room" count as ended only when the client row shows it closed', () => {
  const rls = { code: '42501', message: 'new row violates row-level security policy for table "messages"' };
  const member = { code: '42501', message: 'Not a member of this room' };
  assert.equal(sendFailure(rls, expired, NOW), 'ended');
  assert.equal(sendFailure(member, hostEnded, NOW), 'ended');
  assert.equal(sendFailure(rls, open, NOW), 'other');
  assert.equal(sendFailure(member, open, NOW), 'other');
});

test('a network failure stays offline, even in an ended room', () => {
  assert.equal(sendFailure(new TypeError('Network request failed'), open, NOW), 'offline');
  assert.equal(sendFailure({ name: 'TimeoutError', message: 'timeout' }, expired, NOW), 'offline');
});

test('an unrelated server error stays other while the room is open', () => {
  assert.equal(sendFailure({ code: 'PT409', message: 'room is full' }, open, NOW), 'other');
  assert.equal(sendFailure({ message: 'boom' }, open, NOW), 'other');
});

test('F-EMX1: a stale open row is re-read once, and a refusal then counts as ended', async () => {
  const { sendFailureRefetched } = await import('../src/lib/error-kind.ts');
  const rls = { code: '42501', message: 'new row violates row-level security policy for table "messages"' };
  let reads = 0;
  const fresh = async () => (reads++, hostEnded);
  assert.equal(await sendFailureRefetched(rls, open, NOW, fresh), 'ended');
  assert.equal(reads, 1);
  // the re-read still shows open, empty, or fails: stays other
  assert.equal(await sendFailureRefetched(rls, open, NOW, async () => open), 'other');
  assert.equal(await sendFailureRefetched(rls, open, NOW, async () => null), 'other');
  assert.equal(await sendFailureRefetched(rls, open, NOW, async () => { throw new Error('x'); }), 'other');
});

test('F-EMX1: no re-read for offline, already-ended or unrelated errors', async () => {
  const { sendFailureRefetched } = await import('../src/lib/error-kind.ts');
  const boom = async () => { throw new Error('must not read'); };
  assert.equal(await sendFailureRefetched(new TypeError('Network request failed'), open, NOW, boom), 'offline');
  assert.equal(await sendFailureRefetched({ code: 'P0002', message: 'x' }, open, NOW, boom), 'ended');
  assert.equal(await sendFailureRefetched({ code: 'PT409', message: 'room is full' }, open, NOW, boom), 'other');
});
