// Tests only: feedFix (pace engine) and syncCalendarRooms (calendar store) through the real modules, with React,
// React Native, AsyncStorage and Supabase auth stubbed (same hook pattern as pace-demo-engine.test.mjs).
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const SRC = new URL('../src/', import.meta.url).href;
const stub = (code) => `data:text/javascript,${encodeURIComponent(code)}`;
globalThis.__pace = { log: [], speech: false };
// AsyncStorage with switches for failed reads and writes.
const store = (globalThis.__store = { m: new Map(), failGet: false, failSet: 0 });
const STUBS = {
  // Hooks read the snapshot straight away, so useRunUnsaved/useCalendarFailed can be checked outside React.
  react: stub('export const useSyncExternalStore = (_s, get) => get(); export const useEffect = () => {};'),
  'react-native': stub('export const Vibration = { vibrate: () => {} };'),
  expo: stub('export const requireOptionalNativeModule = () => null;'),
  '@react-native-async-storage/async-storage': stub(`const s = globalThis.__store;
export default {
  getItem: async (k) => { if (s.failGet) throw new Error('read'); return s.m.get(k) ?? null; },
  setItem: async (k, v) => { if (s.failSet > 0) { s.failSet--; throw new Error('write'); } s.m.set(k, v); },
  removeItem: async (k) => { s.m.delete(k); },
};`),
  '@/lib/supabase': stub(`export const supabase = { auth: { onAuthStateChange: (cb) => { globalThis.__auth = cb; return { data: { subscription: { unsubscribe() {} } } }; } } };`),
};
registerHooks({
  resolve(specifier, context, next) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    const spec = specifier.startsWith('@/') ? `${SRC}${specifier.slice(2)}.ts` : specifier;
    return next(spec.startsWith('./') && !spec.endsWith('.ts') && context.parentURL?.startsWith(SRC) ? `${spec}.ts` : spec, context);
  },
});

const engine = await import('../src/features/pace/engine.ts');
const cal = await import('../src/features/calendar/calendar-store.ts');
const { calendarKey } = await import('../src/features/calendar/calendar-data.ts');

const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
};
const HISTORY_KEY = 'qrewing.pace.v1.history';
const history = () => JSON.parse(store.m.get(HISTORY_KEY) ?? '[]');
const M_PER_DEG = 111_195;
// Walking north at 3 m/s, one fix every 5 s, from t0.
const fixAt = (i, t0) => ({ latitude: 37.5 + (i * 15) / M_PER_DEG, longitude: 127, atMs: t0 + i * 5000, accuracyM: 5 });
const ctx = (roomId, nowMs) => ({ roomId, userId: 'me', nowMs, targetSecPerKm: null, route: [], place: null, others: [] });

test('feedFix: the first fix starts a run in memory and saves it to history', async () => {
  const roomId = 'room-a';
  const key = engine.runKey(roomId, 1);
  const t0 = 100_000;
  engine.feedFix(key, fixAt(0, t0), ctx(roomId, t0));
  assert.deepEqual(engine.paceStartPoint({ id: roomId, activity_seq: 1 }), { latitude: 37.5, longitude: 127 });
  assert.equal(engine.liveSessions(roomId).length, 1);
  assert.equal(engine.usePaceRun(key)?.fixes.length, 1);
  await settle();
  assert.equal(history().filter((s) => s.roomId === roomId).length, 1);
  assert.equal(engine.useRunUnsaved(key), false);
});

test('feedFix: the same fix twice is taken once; later fixes add distance', async () => {
  const roomId = 'room-b';
  const key = engine.runKey(roomId, 1);
  const t0 = 200_000;
  engine.feedFix(key, fixAt(0, t0), ctx(roomId, t0));
  engine.feedFix(key, fixAt(0, t0), ctx(roomId, t0));
  assert.equal(engine.usePaceRun(key).fixes.length, 1);
  for (let i = 1; i <= 4; i++) engine.feedFix(key, fixAt(i, t0), ctx(roomId, t0 + i * 5000));
  const run = engine.usePaceRun(key);
  assert.equal(run.fixes.length, 5);
  assert.ok(run.tracker.distanceM > 40 && run.tracker.distanceM < 80, `distance ${run.tracker.distanceM}`);
  await settle();
});

test('feedFix: a failed save retries on the next fix; two failures in a row mark the run unsaved until a save works', async () => {
  const roomId = 'room-c';
  const key = engine.runKey(roomId, 1);
  const t0 = 300_000;
  store.failSet = 1;
  engine.feedFix(key, fixAt(0, t0), ctx(roomId, t0));
  await settle();
  assert.equal(engine.useRunUnsaved(key), false, 'one failure is retried, not shown');
  // Within 30 s, so only the pending retry saves.
  engine.feedFix(key, fixAt(1, t0), ctx(roomId, t0 + 5000));
  await settle();
  assert.equal(history().filter((s) => s.roomId === roomId).length, 1);

  store.failSet = 2;
  engine.feedFix(key, fixAt(7, t0), ctx(roomId, t0 + 35_000)); // 30 s later: a regular save, fails
  await settle();
  engine.feedFix(key, fixAt(8, t0), ctx(roomId, t0 + 40_000)); // the retry, fails too
  await settle();
  assert.equal(engine.useRunUnsaved(key), true);
  engine.retryFailedSaves(); // nothing pending: the unsaved run waits for the next regular save
  engine.feedFix(key, fixAt(14, t0), ctx(roomId, t0 + 70_000));
  await settle();
  assert.equal(engine.useRunUnsaved(key), false);
  assert.equal(store.failSet, 0);
});

const room = (id, over = {}) => ({
  id,
  name: `Room ${id}`,
  type: 'sports',
  starts_at: null,
  created_at: '2026-11-10T18:00:00Z',
  expires_at: '2026-11-11T18:00:00Z',
  ...over,
});
const savedDoc = (uid) => {
  const raw = store.m.get(calendarKey(uid));
  return raw == null ? null : JSON.parse(raw);
};

test('syncCalendarRooms: does nothing without a user or rooms', async () => {
  globalThis.__auth('INITIAL_SESSION', { user: { id: 'u1' } });
  cal.syncCalendarRooms(null, [room('r0')]);
  cal.syncCalendarRooms(undefined, [room('r0')]);
  cal.syncCalendarRooms('u1', []);
  await settle();
  assert.equal(savedDoc('u1'), null);
});

test('syncCalendarRooms: writes the signed-in user\'s rooms with the type emoji, and keeps a chosen emoji on resync', async () => {
  cal.syncCalendarRooms('u1', [room('r1')]);
  await settle();
  const doc = savedDoc('u1');
  assert.equal(doc.rooms.r1.name, 'Room r1');
  assert.equal(doc.rooms.r1.emoji, '🏃');
  assert.equal(doc.rooms.r1.endAt, '2026-11-11T18:00:00Z');

  await cal.saveRecapToCalendar('u1', 'r1', { emoji: '🌊' });
  cal.syncCalendarRooms('u1', [room('r1', { name: 'Renamed' })]);
  await settle();
  assert.equal(savedDoc('u1').rooms.r1.name, 'Renamed');
  assert.equal(savedDoc('u1').rooms.r1.emoji, '🌊');
});

test('syncCalendarRooms: never writes another user\'s calendar', async () => {
  cal.syncCalendarRooms('someone-else', [room('r2')]);
  await settle();
  assert.equal(savedDoc('someone-else'), null);
});

test('syncCalendarRooms: a failed read writes nothing and marks the calendar failed; a reload clears it', async () => {
  globalThis.__auth('SIGNED_IN', { user: { id: 'u2' } });
  store.m.set(calendarKey('u2'), JSON.stringify({ keep: 'me' }));
  const before = store.m.get(calendarKey('u2'));
  store.failGet = true;
  cal.syncCalendarRooms('u2', [room('r3')]);
  await settle();
  store.failGet = false;
  assert.equal(store.m.get(calendarKey('u2')), before, 'the stored doc is untouched');
  assert.equal(cal.useCalendarFailed('u2'), true);
  await cal.reloadCalendar('u2');
  assert.equal(cal.useCalendarFailed('u2'), false);
});

const conn = await import('../src/features/pace/connection.ts');
const paceStore = await import('../src/features/pace/storage.ts');

test('UX2-118 connection: waiting is per room, and setting the same value twice is a no-op', () => {
  assert.equal(conn.usePaceWaiting('w1'), false);
  conn.setPaceWaiting('w1', true);
  conn.setPaceWaiting('w1', true);
  assert.equal(conn.usePaceWaiting('w1'), true);
  assert.equal(conn.usePaceWaiting('w2'), false);
  conn.setPaceWaiting('w1', false);
  conn.setPaceWaiting('w1', false);
  assert.equal(conn.usePaceWaiting('w1'), false);
});

test('paceSnapshot: null unless the room\'s activity is running and my run has a fix', () => {
  const roomId = 'room-snap';
  const active = { id: roomId, activity_state: 'active', activity_seq: 4 };
  assert.equal(engine.paceSnapshot(active, 0), null, 'no run yet');
  const t0 = 500_000;
  engine.feedFix(engine.runKey(roomId, 4), fixAt(0, t0), ctx(roomId, t0));
  assert.equal(engine.paceSnapshot({ ...active, activity_state: 'idle' }, t0), null);
  assert.equal(engine.paceSnapshot({ ...active, activity_seq: 5 }, t0), null, 'another activity of the same room');
  const snap = engine.paceSnapshot(active, t0);
  assert.equal(snap.distanceM, 0);
  assert.equal(snap.paceSecPerKm, null);
});

test('pace storage: the switch is per room; a failed read means off', async () => {
  assert.equal(await paceStore.getPaceOn('s1'), false);
  await paceStore.setPaceOn('s1', true);
  assert.equal(await paceStore.getPaceOn('s1'), true);
  assert.equal(await paceStore.getPaceOn('s2'), false);
  store.failGet = true;
  assert.equal(await paceStore.getPaceOn('s1'), false);
  store.failGet = false;
  await paceStore.setPaceOn('s1', false);
  assert.equal(await paceStore.getPaceOn('s1'), false);
});

test('pace storage: a target round-trips; a bad, unknown or unreadable target falls back to usual', async () => {
  const KEY = 'qrewing.pace.v1.target';
  assert.deepEqual(await paceStore.getTarget(), { kind: 'usual' });
  await paceStore.setTarget({ kind: 'pace', secPerKm: 330 });
  assert.deepEqual(await paceStore.getTarget(), { kind: 'pace', secPerKm: 330 });
  await paceStore.setTarget({ kind: 'time', distanceM: 5000, timeS: 1500 });
  assert.deepEqual(await paceStore.getTarget(), { kind: 'time', distanceM: 5000, timeS: 1500 });
  for (const raw of ['{"kind":"pace","secPerKm":0}', '{"kind":"time","distanceM":5000,"timeS":0}', '{"kind":"other"}', 'not json', 'null']) {
    store.m.set(KEY, raw);
    assert.deepEqual(await paceStore.getTarget(), { kind: 'usual' }, raw);
  }
  store.failGet = true;
  assert.deepEqual(await paceStore.getTarget(), { kind: 'usual' });
  store.failGet = false;
});

test('saveEvent/removeEvent: write the signed-in user\'s events; a failed write resolves false and keeps memory', async () => {
  globalThis.__auth('SIGNED_IN', { user: { id: 'u3' } });
  const ev = { title: ' Dinner ', start: '2026-11-20', end: '2026-11-20', emoji: '🍜' };
  assert.equal(await cal.saveEvent('u3', 'e1', ev), true);
  assert.deepEqual(savedDoc('u3').events, [{ id: 'e1', title: 'Dinner', start: '2026-11-20', end: '2026-11-20', emoji: '🍜' }]);
  assert.equal(await cal.saveEvent('u3', 'e1', { ...ev, title: 'Lunch' }), true);
  assert.equal(savedDoc('u3').events.length, 1);
  assert.equal(savedDoc('u3').events[0].title, 'Lunch');
  assert.equal(await cal.saveEvent('u4', 'e9', ev), false, 'not the signed-in user');
  assert.equal(savedDoc('u4'), null);

  store.failSet = 1;
  assert.equal(await cal.removeEvent('u3', 'e1'), false);
  assert.equal(savedDoc('u3').events.length, 1, 'the phone copy is unchanged');
  assert.equal(cal.useCalendar('u3').events.length, 0, 'memory already has the change');
  assert.equal(await cal.removeEvent('u3', 'e1'), true);
  assert.deepEqual(savedDoc('u3').events, []);
});
