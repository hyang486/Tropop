// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRoomEmergencies,
  emergencyLine,
  emergencyStartedAt,
  sortEmergencyFirst,
} from '../src/features/event/emergency-row.ts';
import { createRoomsLive } from '../src/features/event/rooms-live.ts';

const defs = [
  { id: 'em1', room_id: 'r1', is_emergency: true },
  { id: 'ok1', room_id: 'r1', is_emergency: false },
  { id: 'em2', room_id: 'r2', is_emergency: true },
];
const p = (userId, name, startedAt) => ({ userId, name, startedAt });

test('build: only members whose current status is an Emergency status of that room count', () => {
  const map = buildRoomEmergencies(
    defs,
    [
      { room_id: 'r1', user_id: 'sora', status_id: 'em1' },
      { room_id: 'r1', user_id: 'jun', status_id: 'ok1' },
      // em2 belongs to r2, so it does not count in r1.
      { room_id: 'r1', user_id: 'mina', status_id: 'em2' },
    ],
    [
      { room_id: 'r1', user_id: 'sora', created_at: '2026-11-14T17:00:00Z' },
      { room_id: 'r1', user_id: 'sora', created_at: '2026-11-14T17:50:00Z' },
      { room_id: 'r1', user_id: 'jun', created_at: '2026-11-14T17:40:00Z' },
    ],
    [{ id: 'sora', display_name: 'Sora' }],
    'Someone',
  );
  assert.deepEqual([...map.keys()], ['r1']);
  assert.deepEqual(map.get('r1'), [p('sora', 'Sora', '2026-11-14T17:50:00Z')], 'latest event is the start');
});

test('build: no event falls back to the status time, missing name to Someone, newest first', () => {
  const map = buildRoomEmergencies(
    defs,
    [
      { room_id: 'r1', user_id: 'a', status_id: 'em1', updated_at: '2026-11-14T10:00:00Z' },
      { room_id: 'r1', user_id: 'b', status_id: 'em1', updated_at: '2026-11-14T09:00:00Z' },
      { room_id: 'r1', user_id: 'c', status_id: 'em1' },
    ],
    [{ room_id: 'r1', user_id: 'b', created_at: '2026-11-14T11:00:00Z' }],
    [{ id: 'a', display_name: '  ' }, { id: 'b', display_name: 'Bo' }],
    'Someone',
  );
  // c has neither an event nor a status time, so it is left out.
  assert.deepEqual(map.get('r1'), [p('b', 'Bo', '2026-11-14T11:00:00Z'), p('a', 'Someone', '2026-11-14T10:00:00Z')]);
});

test('line: one other, two or more, own alone, own with others, resolved', () => {
  const sora = p('sora', 'Sora', '2026-11-14T17:50:00Z');
  const jun = p('jun', 'Jun', '2026-11-14T17:40:00Z');
  const me = p('me', 'Mina', '2026-11-14T17:55:00Z');
  assert.deepEqual(emergencyLine([sora], 'me'), { kind: 'one', name: 'Sora' });
  assert.deepEqual(emergencyLine([sora, jun], 'me'), { kind: 'many', name: 'Sora', more: 1 });
  assert.deepEqual(emergencyLine([me], 'me'), { kind: 'own' });
  // Mixed (ux): the newest other person, and "N more" counts me too.
  assert.deepEqual(emergencyLine([me, sora, jun], 'me'), { kind: 'many', name: 'Sora', more: 2 });
  assert.deepEqual(emergencyLine([me, sora], 'me'), { kind: 'many', name: 'Sora', more: 1 });
  assert.equal(emergencyLine([], 'me'), null);
  assert.equal(emergencyLine(undefined, 'me'), null);
});

test('start time: the newest Emergency start, null when resolved', () => {
  assert.equal(
    emergencyStartedAt([p('a', 'A', '2026-11-14T17:00:00Z'), p('b', 'B', '2026-11-14T17:30:00Z')]),
    '2026-11-14T17:30:00Z',
  );
  assert.equal(emergencyStartedAt([]), null);
  assert.equal(emergencyStartedAt(undefined), null);
});

test('sort: Emergency rows first, newest start first; others keep their order', () => {
  const at = { b: '2026-11-14T17:00:00Z', d: '2026-11-14T17:30:00Z' };
  const rows = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(sortEmergencyFirst(rows, (r) => at[r] ?? null), ['d', 'b', 'a', 'c', 'e']);
  assert.deepEqual(sortEmergencyFirst(rows, () => null), rows, 'resolved: back to the normal order');
});

test('rooms live: member_status changes also refetch (an Emergency can end with no message)', () => {
  let refetches = 0;
  let fire;
  const pending = [];
  const live = createRoomsLive({
    acquire: (_id, l) => {
      fire = l.onEvent;
      return () => undefined;
    },
    refetch: () => (refetches += 1),
    setTimer: (fn) => pending.push(fn),
    clearTimer: () => pending.splice(0),
  });
  live.setRooms(['r1']);
  fire({ table: 'member_status', op: 'DELETE' });
  pending.splice(0).forEach((fn) => fn());
  assert.equal(refetches, 1);
});
