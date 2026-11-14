// Tests only: useRecapTriggers and useGrace through the real modules. React is a tiny hook runner (state, refs,
// effects with deps and cleanups); recap-store, room-channel and use-now are stubbed (registerHooks pattern of
// pace-calendar-store.test.mjs). Timers and Date come from node:test mock timers.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mock, test } from 'node:test';

const SRC = new URL('../src/', import.meta.url).href;
const stub = (code) => `data:text/javascript,${encodeURIComponent(code)}`;
const R = (globalThis.__r = { slots: [], i: 0, queue: [] });
globalThis.__calls = [];
globalThis.__mark = null;
globalThis.__now = 0;
const STUBS = {
  react: stub(`const R = globalThis.__r;
const slot = (init) => { const k = R.i++; if (!(k in R.slots)) R.slots[k] = init(); return R.slots[k]; };
export const useRef = (v) => slot(() => ({ current: v }));
export const useState = (v) => { const s = slot(() => ({ v: typeof v === 'function' ? v() : v })); return [s.v, (n) => { s.v = n; R.renders = (R.renders ?? 0) + 1; }]; };
export const useEffect = (fn, deps) => {
  const s = slot(() => ({ deps: null, cleanup: null }));
  if (s.deps && deps.every((d, j) => Object.is(d, s.deps[j]))) return;
  s.deps = deps;
  R.queue.push(() => { s.cleanup?.(); s.cleanup = fn() ?? null; });
};`),
  '@/lib/use-now': stub('export const useNow = () => globalThis.__now;'),
  '@/lib/room-channel': stub('export const useRoomEvents = (_id, cb) => { globalThis.__roomEvent = cb; };'),
  './recap-store': stub(`const c = (name) => (...a) => { globalThis.__calls.push([name, ...a]); };
export const saveMyPartWhileOpen = c('myPart');
export const bumpOpenMessages = c('bump');
export const saveMessageCountWhileOpen = c('count');
export const loadMark = async (id) => { globalThis.__calls.push(['loadMark', id]); return globalThis.__mark; };
export const saveMark = async (id, patch) => {
  globalThis.__calls.push(['saveMark', id, patch]);
  return (globalThis.__mark = { ai: true, first: false, refresh: false, ...(globalThis.__mark ?? {}), ...patch });
};
export const fetchAndSaveRecap = async (...a) => { globalThis.__calls.push(['fetch', ...a]); };
export const readAndSaveRecap = async (...a) => { globalThis.__calls.push(['read', ...a]); };`),
};
registerHooks({
  resolve(specifier, context, next) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    const spec = specifier.startsWith('@/') ? `${SRC}${specifier.slice(2)}.ts` : specifier;
    return next(spec.startsWith('./') && !spec.endsWith('.ts') && context.parentURL?.startsWith(SRC) ? `${spec}.ts` : spec, context);
  },
});

const { useRecapTriggers } = await import('../src/features/recap/use-recap-triggers.ts');
const { useGrace } = await import('../src/features/recap/use-grace.ts');
const { noteMessageSent } = await import('../src/features/recap/sent-signal.ts');
const { SEND_SAVE_DEBOUNCE_MS, FIRST_CALL_MS, REFRESH_CALL_MS } = await import('../src/features/recap/recap-plan.ts');

function render(hook, ...args) {
  R.i = 0;
  const out = hook(...args);
  for (const run of R.queue.splice(0)) run();
  return out;
}
function unmount() {
  for (const s of R.slots) s?.cleanup?.();
  R.slots = [];
}
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const calls = (name) => globalThis.__calls.filter((c) => c[0] === name);
function fresh() {
  unmount();
  globalThis.__calls = [];
  globalThis.__mark = null;
  globalThis.__roomEvent = null;
}
const HOURS = 5 * 60 * 60_000;

test('useRecapTriggers: off without AI or a user', async () => {
  fresh();
  render(useRecapTriggers, 'r1', 'me', false, 30 * 60_000);
  render(useRecapTriggers, 'r1', undefined, true, 30 * 60_000);
  noteMessageSent('r1');
  globalThis.__roomEvent?.({ table: 'room_recaps' });
  await settle();
  assert.deepEqual(globalThis.__calls, []);
  unmount();
});

test('useRecapTriggers: my part on open; sends bump at once and recount once after the debounce', async (t) => {
  fresh();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  render(useRecapTriggers, 'r1', 'me', true, HOURS);
  assert.deepEqual(calls('myPart'), [['myPart', 'r1', 'me']]);
  noteMessageSent('r1');
  noteMessageSent('other-room');
  t.mock.timers.tick(SEND_SAVE_DEBOUNCE_MS - 1);
  noteMessageSent('r1');
  assert.equal(calls('bump').length, 2);
  t.mock.timers.tick(SEND_SAVE_DEBOUNCE_MS - 1);
  assert.equal(calls('count').length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(calls('count'), [['count', 'r1', 'me']]);
  unmount();
});

test('useRecapTriggers: leaving inside the debounce counts at once, and later sends are not heard', (t) => {
  fresh();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  render(useRecapTriggers, 'r1', 'me', true, HOURS);
  noteMessageSent('r1');
  unmount();
  assert.equal(calls('count').length, 1);
  t.mock.timers.tick(SEND_SAVE_DEBOUNCE_MS);
  noteMessageSent('r1');
  assert.equal(calls('count').length, 1);
  assert.equal(calls('bump').length, 1);
});

test('useRecapTriggers: nothing before 60 min left; first call at 60 min, marked before the fetch', async () => {
  fresh();
  render(useRecapTriggers, 'r1', 'me', true, FIRST_CALL_MS + 1);
  await settle();
  assert.equal(calls('fetch').length, 0);
  render(useRecapTriggers, 'r1', 'me', true, FIRST_CALL_MS);
  await settle();
  const names = globalThis.__calls.map((c) => c[0]).filter((n) => n === 'saveMark' || n === 'fetch');
  assert.deepEqual(names.slice(-2), ['saveMark', 'fetch']);
  assert.deepEqual(calls('saveMark').at(-1), ['saveMark', 'r1', { first: true }]);
  assert.deepEqual(calls('fetch'), [['fetch', 'r1', 'me', undefined]]);
  // Next tick, still above 10 min: no repeat.
  render(useRecapTriggers, 'r1', 'me', true, FIRST_CALL_MS - 60_000);
  await settle();
  assert.equal(calls('fetch').length, 1);
  // Last 10 min: one refresh.
  render(useRecapTriggers, 'r1', 'me', true, REFRESH_CALL_MS);
  await settle();
  assert.deepEqual(calls('fetch').at(-1), ['fetch', 'r1', 'me', { refresh: true }]);
  render(useRecapTriggers, 'r1', 'me', true, REFRESH_CALL_MS - 60_000);
  await settle();
  assert.equal(calls('fetch').length, 2);
  unmount();
});

test('useRecapTriggers: first seen in the last 10 min → one late call with refresh that marks both', async () => {
  fresh();
  render(useRecapTriggers, 'r1', 'me', true, 5 * 60_000);
  await settle();
  assert.deepEqual(calls('fetch'), [['fetch', 'r1', 'me', { refresh: true }]]);
  assert.deepEqual(globalThis.__mark, { ai: true, first: true, refresh: true });
  unmount();
});

test('useRecapTriggers: a call already in flight is not doubled by the next tick', async () => {
  fresh();
  render(useRecapTriggers, 'r1', 'me', true, 30 * 60_000);
  // Same render pass, before the first call settles.
  render(useRecapTriggers, 'r1', 'me', true, 29 * 60_000);
  await settle();
  assert.equal(calls('loadMark').length, 1);
  assert.equal(calls('fetch').length, 1);
  unmount();
});

test('useRecapTriggers: a room_recaps event saves the recap; other tables are ignored', async () => {
  fresh();
  render(useRecapTriggers, 'r1', 'me', true, HOURS);
  globalThis.__roomEvent({ table: 'messages' });
  globalThis.__roomEvent({ table: 'room_recaps' });
  await settle();
  assert.deepEqual(calls('read'), [['read', 'r1', 'me']]);
  unmount();
});

const NOW = Date.parse('2026-11-14T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

test('useGrace: no room, an open room, or a past grace_until is not grace', (t) => {
  fresh();
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: NOW });
  globalThis.__now = NOW;
  assert.deepEqual(render(useGrace, null), { grace: false, untilMs: null });
  unmount();
  const open = { deleted_at: null, expires_at: iso(NOW + HOURS), grace_until: iso(NOW + 60_000) };
  assert.deepEqual(render(useGrace, open), { grace: false, untilMs: null });
  unmount();
  const past = { deleted_at: iso(NOW - 120_000), expires_at: '', grace_until: iso(NOW - 1) };
  assert.deepEqual(render(useGrace, past), { grace: false, untilMs: null });
  unmount();
});

test('useGrace: in grace until grace_until; the one-shot timer flips it to ended without the clock moving', (t) => {
  fresh();
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: NOW });
  globalThis.__now = NOW;
  const until = NOW + 5 * 60_000;
  const room = { deleted_at: iso(NOW - 60_000), expires_at: '', grace_until: iso(until) };
  assert.deepEqual(render(useGrace, room), { grace: true, untilMs: until });
  t.mock.timers.tick(5 * 60_000 + 249);
  assert.deepEqual(render(useGrace, room), { grace: true, untilMs: until });
  t.mock.timers.tick(1);
  // The 30 s clock (useNow) is still at NOW; only the timer's tick ends grace.
  assert.deepEqual(render(useGrace, room), { grace: false, untilMs: null });
  unmount();
});

test('useGrace: unmount clears the pending timer', (t) => {
  fresh();
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: NOW });
  globalThis.__now = NOW;
  const room = { deleted_at: iso(NOW), expires_at: '', grace_until: iso(NOW + 60_000) };
  render(useGrace, room);
  R.renders = 0;
  unmount();
  t.mock.timers.tick(120_000);
  assert.equal(R.renders, 0);
});
