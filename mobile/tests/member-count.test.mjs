// Run: npm test. UX P1-5: Rooms rows show the embedded room_members(count).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const { withMemberCount } = await import('../src/lib/member-count.ts');

test('the embedded count flattens to member_count and the nested field goes', () => {
  const row = withMemberCount({ id: 'r1', name: 'Run', room_members: [{ count: 5 }] });
  assert.deepEqual(row, { id: 'r1', name: 'Run', member_count: 5 });
});

test('a missing, empty or malformed embed gives null, never a wrong number', () => {
  assert.equal(withMemberCount({ id: 'r' }).member_count, null);
  assert.equal(withMemberCount({ id: 'r', room_members: [] }).member_count, null);
  assert.equal(withMemberCount({ id: 'r', room_members: null }).member_count, null);
  assert.equal(withMemberCount({ id: 'r', room_members: [{ count: '3' }] }).member_count, null);
  assert.equal(withMemberCount({ id: 'r', room_members: [{ count: -1 }] }).member_count, null);
  assert.equal(withMemberCount({ id: 'r', room_members: [{ count: 0 }] }).member_count, 0);
});

test('listMyRooms embeds room_members(count) and flattens every row', () => {
  const src = readFileSync(new URL('../src/lib/rooms.ts', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('export async function listMyRooms'), src.indexOf('export async function getRoom'));
  assert.match(fn, /\.select\('\*, room_members\(count\)'\)/);
  assert.match(fn, /data\.map\(withMemberCount\)/);
});
