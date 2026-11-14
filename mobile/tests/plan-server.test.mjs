// Run: npm test. Plus plan from the server (0032 user_plans / set_my_plan) with the local key as cache and fallback.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const d = await import('../src/features/calendar/calendar-data.ts');

test('0032 missing (table or RPC) is a fallback, not an error', () => {
  for (const code of ['42P01', 'PGRST205', '42883', 'PGRST202']) assert.equal(d.planMissing({ code }), true, code);
  for (const e of [{ code: '22023' }, { code: '42501' }, { message: 'Network request failed' }, null]) assert.equal(d.planMissing(e), false);
});

test('read: plus row on, free or no row off, any error keeps the local cache', () => {
  assert.equal(d.planFromRead({ data: { plan: 'plus' }, error: null }), true);
  assert.equal(d.planFromRead({ data: { plan: 'free' }, error: null }), false);
  assert.equal(d.planFromRead({ data: null, error: null }), false);
  assert.equal(d.planFromRead({ data: null, error: { code: 'PGRST205' } }), null);
  assert.equal(d.planFromRead({ data: null, error: { message: 'offline' } }), null);
});

test('save: ok saved, 0032 missing stays local, anything else reverts', () => {
  assert.equal(d.planSaveOutcome(null), 'saved');
  assert.equal(d.planSaveOutcome({ code: 'PGRST202' }), 'local');
  assert.equal(d.planSaveOutcome({ code: '42883' }), 'local');
  assert.equal(d.planSaveOutcome({ code: '22023' }), 'revert');
  assert.equal(d.planSaveOutcome({ code: '42501' }), 'revert');
  assert.equal(d.planSaveOutcome(new Error('Network request failed')), 'revert');
});

test('store reads user_plans first, writes via set_my_plan, reverts on failure, keeps useSyncExternalStore', () => {
  const s = readFileSync(new URL('../src/features/calendar/calendar-store.ts', import.meta.url), 'utf8');
  assert.match(s, /from\('user_plans'\)\.select\('plan'\)\.eq\('user_id', uid\)\.maybeSingle\(\)/);
  assert.match(s, /rpc\('set_my_plan', \{ p_plan: on \? 'plus' : 'free' \}\)/);
  assert.match(s, /planSaveOutcome\(error\) === 'revert'[\s\S]*plus\.set\(uid, before\)/);
  assert.match(s, /useSyncExternalStore\(subscribe, \(\) => \(uid \? \(plus\.get\(uid\) \?\? null\) : null\)\)/);
  const p = readFileSync(new URL('../src/app/plan-preview.tsx', import.meta.url), 'utf8');
  assert.match(p, /if \(!ok\) Alert\.alert\(t\.saveFailedTitle, t\.saveFailedBody\)/);
  assert.match(p, /disabled=\{saving \|\| on === null\}/);
});
