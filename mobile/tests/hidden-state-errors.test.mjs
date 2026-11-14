// Run: npm test. Hidden-state sweep (2026-11-14): the error text an upload row, viewer or map shows when a call fails.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const src = new URL('../src/', import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) specifier = `${src}${specifier.slice(2)}`;
    if ((specifier.startsWith('./') || specifier.startsWith(src)) && !specifier.endsWith('.ts')) specifier += '.ts';
    return next(specifier, context);
  },
});

const { appError, errorMessage } = await import('../src/lib/errors.ts');
const { errorKind } = await import('../src/lib/error-kind.ts');
const { deadEndError, deadEndOf } = await import('../src/lib/storage-cap.ts');
const { en } = await import('../src/i18n/en.ts');

test('errorMessage: app copy passes through, raw server and network text never does', () => {
  assert.equal(errorMessage(appError('Built at runtime 42')), 'Built at runtime 42');
  assert.equal(errorMessage(deadEndError('storage', 'Room full text')), 'Room full text');
  assert.equal(errorMessage(new Error(en.media.outOfSpace)), en.media.outOfSpace);
  assert.equal(errorMessage({ message: 'Only the host can edit the route.' }), 'Only the host can edit the route.');
  assert.equal(errorMessage(new TypeError('Network request failed')), en.errors.offline);
  assert.equal(errorMessage({ code: 'P0002', message: 'x' }), en.errors.ended);
  assert.equal(errorMessage({ message: 'duplicate key value violates unique constraint "x"' }), en.errors.generic);
  assert.equal(errorMessage(null), en.errors.generic);
  assert.equal(errorMessage('a string'), en.errors.generic);
});

test('errorKind: native upload/download failures are offline by message alone', () => {
  assert.equal(errorKind(new Error('The network connection was lost.')), 'offline');
  assert.equal(errorKind(new Error('The Internet connection appears to be offline.')), 'offline');
  assert.equal(errorKind(new Error('TypeError: Network request failed')), 'offline');
});

test('errorKind: 401, PGRST301, expired rooms and PT429 without its text', () => {
  assert.equal(errorKind({ status: 401, message: 'x' }), 'notAllowed');
  assert.equal(errorKind({ code: 'PGRST301', message: 'JWT expired' }), 'notAllowed');
  assert.equal(errorKind({ message: 'This room has expired' }), 'ended');
  assert.equal(errorKind({ message: 'room expired' }), 'ended');
  assert.equal(errorKind({ code: 'PT429', message: 'x' }), 'throttled');
});

test('deadEndOf: only storage and file are dead ends', () => {
  assert.equal(deadEndOf({ deadEnd: 'other' }), undefined);
  assert.equal(deadEndOf({ deadEnd: 1 }), undefined);
  assert.equal(deadEndOf('storage'), undefined);
});
