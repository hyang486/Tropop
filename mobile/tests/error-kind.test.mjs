// Run: npm test. UX2-34: raw server and network errors map to a few plain kinds.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { errorKind } from '../src/lib/error-kind.ts';

test('network failures are offline', () => {
  assert.equal(errorKind(new TypeError('Network request failed')), 'offline');
  assert.equal(errorKind({ name: 'FunctionsFetchError', message: 'Failed to send a request' }), 'offline');
});

test('ended and expired rooms are ended', () => {
  assert.equal(errorKind({ code: 'P0002', message: 'This room has ended.' }), 'ended');
  assert.equal(errorKind({ code: '42501', message: 'Not a member of an open room' }), 'ended');
});

test('a plain "not a member" is notMember', () => {
  assert.equal(errorKind({ code: '42501', message: 'Not a member of this room' }), 'notMember');
});

test('other permission refusals are notAllowed', () => {
  assert.equal(errorKind({ code: '42501', message: 'Only the host can end this room.' }), 'notAllowed');
  assert.equal(errorKind({ code: '42501', message: 'new row violates row-level security policy for table "media"' }), 'notAllowed');
  assert.equal(errorKind({ status: 403, message: 'Forbidden' }), 'notAllowed');
});

test('server limits keep their own kind', () => {
  assert.equal(errorKind({ code: 'PT409', message: 'This room is full.' }), 'full');
  assert.equal(errorKind({ code: '54000', message: 'This room is full.' }), 'full');
  assert.equal(errorKind({ code: '54000', message: 'Too many attempts. Try again in a few minutes.' }), 'throttled');
});

test('anything else is generic', () => {
  assert.equal(errorKind({ code: '22023', message: 'Invalid value' }), 'generic');
  assert.equal(errorKind(new Error('Upload failed (HTTP 500)')), 'generic');
  assert.equal(errorKind('oops'), 'generic');
  assert.equal(errorKind(null), 'generic');
});
