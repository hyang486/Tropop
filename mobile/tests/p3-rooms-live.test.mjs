// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRoomChannels } from '../src/lib/room-channel-core.ts';
import { createRoomsLive } from '../src/features/event/rooms-live.ts';

/** A fake client: records opened/removed topics and lets tests push payloads into an open topic. */
function fakeClient() {
  const open = new Map();
  const log = { opened: [], removed: [] };
  return {
    log,
    open: (topic, onPayload, onStatus) => {
      const ch = { topic, onPayload, onStatus };
      open.set(topic, ch);
      log.opened.push(topic);
      return ch;
    },
    remove: (ch) => {
      open.delete(ch.topic);
      log.removed.push(ch.topic);
    },
    emit: (topic, payload) => open.get(topic)?.onPayload(payload),
    isOpen: (topic) => open.has(topic),
  };
}

const listener = (events) => ({ onEvent: (e) => events.push(e), onStatus: () => undefined });

/** Manual timers for the debounce. */
function timers() {
  let seq = 0;
  const pending = new Map();
  return {
    setTimer: (fn, ms) => {
      seq += 1;
      pending.set(seq, { fn, ms });
      return seq;
    },
    clearTimer: (h) => pending.delete(h),
    flush: () => {
      const all = [...pending.values()];
      pending.clear();
      for (const t of all) t.fn();
    },
    count: () => pending.size,
    delays: () => [...pending.values()].map((t) => t.ms),
  };
}

test('shared channel: Rooms releasing leaves the room screen listener alive', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const roomScreen = [];
  const rooms = [];
  const releaseScreen = ch.acquire('r1', listener(roomScreen));
  const releaseRooms = ch.acquire('r1', listener(rooms));
  assert.deepEqual(client.log.opened, ['room:r1'], 'one channel for both consumers');

  releaseRooms();
  assert.equal(client.isOpen('room:r1'), true);
  client.emit('room:r1', { table: 'messages', op: 'INSERT', id: 'm1' });
  assert.equal(roomScreen.length, 1);
  assert.equal(rooms.length, 0);

  releaseScreen();
  assert.deepEqual(client.log.removed, ['room:r1'], 'removed only when the last listener goes');
});

test('shared channel: the reverse order also keeps the other consumer, and a double release is a no-op', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const rooms = [];
  const releaseScreen = ch.acquire('r1', listener([]));
  const releaseRooms = ch.acquire('r1', listener(rooms));
  releaseScreen();
  releaseScreen();
  assert.equal(ch.listenerCount('r1'), 1);
  client.emit('room:r1', { table: 'messages', op: 'INSERT' });
  assert.equal(rooms.length, 1);
  releaseRooms();
  assert.equal(ch.size(), 0);
  // A later acquire opens a fresh channel.
  ch.acquire('r1', listener([]));
  assert.deepEqual(client.log.opened, ['room:r1', 'room:r1']);
});

test('shared channel: a late subscriber gets the current status', async () => {
  const statuses = [];
  // The channel reports SUBSCRIBED as soon as it opens.
  const fake = fakeClient();
  const ch2 = createRoomChannels({
    open: (topic, onPayload, onStatus) => {
      const c = fake.open(topic, onPayload, onStatus);
      onStatus('SUBSCRIBED');
      return c;
    },
    remove: fake.remove,
  });
  ch2.acquire('r2', listener([]));
  ch2.acquire('r2', { onEvent: () => undefined, onStatus: (s) => statuses.push(s) });
  await Promise.resolve();
  assert.deepEqual(statuses, ['SUBSCRIBED']);
});

test('rooms live: subscribe on start, teardown on stop', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const t = timers();
  let refetches = 0;
  const live = createRoomsLive({ acquire: ch.acquire, refetch: () => (refetches += 1), ...t });
  live.setRooms(['a', 'b']);
  assert.deepEqual(client.log.opened.sort(), ['room:a', 'room:b']);
  live.stop();
  assert.deepEqual(client.log.removed.sort(), ['room:a', 'room:b']);
  assert.equal(ch.size(), 0);
  // Events after stop do nothing.
  live.setRooms(['c']);
  assert.equal(client.log.opened.length, 2);
  assert.equal(refetches, 0);
});

test('rooms live: messages INSERT refetches once after the debounce; other events do not', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const t = timers();
  let refetches = 0;
  const live = createRoomsLive({ acquire: ch.acquire, refetch: () => (refetches += 1), ...t });
  live.setRooms(['a', 'b']);

  client.emit('room:a', { table: 'member_status', op: 'UPDATE' });
  client.emit('room:a', { table: 'messages', op: 'DELETE' });
  assert.equal(t.count(), 0);

  client.emit('room:a', { table: 'messages', op: 'INSERT', id: '1' });
  client.emit('room:b', { table: 'messages', op: 'INSERT', id: '2' });
  client.emit('room:a', { table: 'messages', op: 'INSERT', id: '3' });
  assert.equal(t.count(), 1, 'a burst keeps one pending refetch');
  assert.deepEqual(t.delays(), [1000]);
  assert.equal(refetches, 0);
  t.flush();
  assert.equal(refetches, 1);
});

test('rooms live: stop drops a pending refetch', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const t = timers();
  let refetches = 0;
  const live = createRoomsLive({ acquire: ch.acquire, refetch: () => (refetches += 1), ...t });
  live.setRooms(['a']);
  client.emit('room:a', { table: 'messages', op: 'INSERT' });
  live.stop();
  t.flush();
  assert.equal(refetches, 0);
});

test('rooms live: an id-set change joins new rooms and leaves dropped ones only', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const live = createRoomsLive({ acquire: ch.acquire, refetch: () => undefined, ...timers() });
  live.setRooms(['a', 'b']);
  live.setRooms(['b', 'c']);
  assert.deepEqual(live.joined().sort(), ['b', 'c']);
  assert.deepEqual(client.log.removed, ['room:a']);
  assert.deepEqual(client.log.opened.sort(), ['room:a', 'room:b', 'room:c']);
  live.setRooms([]);
  assert.equal(ch.size(), 0);
});

test('rooms live: leaving a room on the list keeps the room screen subscribed', () => {
  const client = fakeClient();
  const ch = createRoomChannels(client);
  const screen = [];
  ch.acquire('a', listener(screen));
  const live = createRoomsLive({ acquire: ch.acquire, refetch: () => undefined, ...timers() });
  live.setRooms(['a']);
  live.stop();
  assert.equal(client.isOpen('room:a'), true);
  client.emit('room:a', { table: 'messages', op: 'INSERT' });
  assert.equal(screen.length, 1);
});
