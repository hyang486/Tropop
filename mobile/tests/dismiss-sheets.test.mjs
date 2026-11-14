import assert from 'node:assert/strict';
import test from 'node:test';

import { dismissSheets, onDismissSheets } from '../src/lib/dismiss-sheets.ts';

test('UX2-46: dismissSheets closes every subscribed sheet once, and an unsubscribed one not at all', () => {
  const closed = [];
  const offA = onDismissSheets(() => closed.push('notices'));
  const offB = onDismissSheets(() => closed.push('status'));
  const offC = onDismissSheets(() => closed.push('answer'));
  offC();
  assert.equal(dismissSheets(), 2);
  assert.deepEqual(closed.sort(), ['notices', 'status']);
  offA();
  offB();
  assert.equal(dismissSheets(), 0);
});

test('UX2-46: a throwing sheet never stops the others', () => {
  const closed = [];
  const warn = console.warn;
  console.warn = () => {};
  const offA = onDismissSheets(() => {
    throw new Error('boom');
  });
  const offB = onDismissSheets(() => closed.push('picker'));
  try {
    assert.equal(dismissSheets(), 1);
    assert.deepEqual(closed, ['picker']);
  } finally {
    console.warn = warn;
    offA();
    offB();
  }
});

test('UX2-46: a sheet that unsubscribes while closing (its own close) does not skip the next one', () => {
  const closed = [];
  const offA = onDismissSheets(() => {
    closed.push('a');
    offA();
  });
  const offB = onDismissSheets(() => closed.push('b'));
  assert.equal(dismissSheets(), 2);
  assert.deepEqual(closed, ['a', 'b']);
  offB();
});
