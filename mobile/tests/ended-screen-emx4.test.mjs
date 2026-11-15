// Run: npm test. F-EMX4: the ended screen keeps its closed-at time after an expiry refusal, and Emergency after expiry says "ended".
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { sendFailure, sendFailureRefetched } from '../src/lib/error-kind.ts';
import { keepRowAfterRefusal, roomClosedAtMs } from '../src/lib/room-ended.ts';

const NOW = Date.parse('2026-11-14T12:00:00Z');
const open = { deleted_at: null, expires_at: '2026-11-14T13:00:00Z' };
const expired = { deleted_at: null, expires_at: '2026-11-14T11:59:56Z' };
const hostEnded = { deleted_at: '2026-11-14T11:30:00Z', expires_at: '2026-11-14T13:00:00Z' };

test('a refused re-read keeps the held row once its end time has passed (closed-at stays known)', () => {
  assert.equal(keepRowAfterRefusal(expired, NOW), true);
  assert.equal(roomClosedAtMs(expired, NOW), Date.parse(expired.expires_at));
});

test('leave, removal or a host end are still gone: refusal while the clock says open, or deleted_at set', () => {
  assert.equal(keepRowAfterRefusal(open, NOW), false);
  assert.equal(keepRowAfterRefusal(hostEnded, NOW), false);
  assert.equal(keepRowAfterRefusal(null, NOW), false);
  assert.equal(keepRowAfterRefusal({ deleted_at: null, expires_at: 'nope' }, NOW), false);
});

test('the room screen applies it only to a ready row; no row still means gone', () => {
  const src = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');
  assert.match(src, /s\.status === 'ready' && keepRowAfterRefusal\(s\.room, Date\.now\(\)\) \? s : \{ status: 'gone' \}/);
});

test('Emergency refused after expiry (set_my_status 42501, or an RLS refusal) is the ended cause, not offline', () => {
  const notMember = { code: '42501', message: 'Not a member of this room' };
  assert.equal(sendFailure(notMember, expired, NOW), 'ended');
  assert.equal(sendFailure(new Error('new row violates row-level security policy'), expired, NOW), 'ended');
  assert.equal(sendFailure(notMember, open, NOW), 'other');
});

test('Emergency refused with a stale open row: one re-read that shows it closed gives ended', async () => {
  const notMember = { code: '42501', message: 'Not a member of this room' };
  assert.equal(await sendFailureRefetched(notMember, open, NOW, async () => expired), 'ended');
  assert.equal(await sendFailureRefetched(notMember, open, NOW, async () => null), 'other');
});

test('confirmEmergency shows the ended alert for an ended cause and the offline alert otherwise', () => {
  const src = readFileSync(new URL('../src/components/status-picker.tsx', import.meta.url), 'utf8');
  assert.match(src, /\(await room\?\.classify\(e\)\) === 'ended' \? 'ended' : 'offline'/);
  assert.match(src, /if \(room\?\.ended\(\)\) \{\s*emergencyFailedAlert\('ended'/);
});

test('the ended screen draws its title in the content (QScreen title), not the nav bar', () => {
  const src = readFileSync(new URL('../src/components/room-ended.tsx', import.meta.url), 'utf8');
  assert.match(src, /title=\{en\.room\.endedTitle\}/);
});
