// Run: npm test (node --test, Node 24 strips the .ts types).
// G-1: switching the gallery filter must load the new filter, and a slow fetch for the old
// filter must not overwrite it.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadLatest } from '../src/lib/latest-load.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('applies the result when the key is unchanged', async () => {
  const applied = [];
  const r = await loadLatest('r|all|u', () => 'r|all|u', async () => ['a'], (o) => applied.push(o));
  assert.equal(r, 'applied');
  assert.deepEqual(applied, [{ ok: true, data: ['a'] }]);
});

test('a slow fetch for the old filter cannot overwrite the new filter', async () => {
  let current = 'r|all|u';
  const applied = [];
  const slowAll = deferred();
  const allRun = loadLatest('r|all|u', () => current, () => slowAll.promise, (o) => applied.push(['all', o]));
  current = 'r|mine|u';
  const mineRun = loadLatest('r|mine|u', () => current, async () => ['mine'], (o) => applied.push(['mine', o]));
  assert.equal(await mineRun, 'applied');
  slowAll.resolve(['all']);
  assert.equal(await allRun, 'stale');
  assert.deepEqual(applied, [['mine', { ok: true, data: ['mine'] }]]);
});

test('errors are applied for the current key and dropped for a stale one', async () => {
  const boom = new Error('x');
  const applied = [];
  assert.equal(await loadLatest('k', () => 'k', async () => { throw boom; }, (o) => applied.push(o)), 'applied');
  assert.deepEqual(applied, [{ ok: false, error: boom }]);
  assert.equal(await loadLatest('k', () => 'other', async () => { throw boom; }, (o) => applied.push(o)), 'stale');
  assert.equal(applied.length, 1);
});
