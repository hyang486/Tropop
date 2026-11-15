// Run: npm test. UX2-34: raw server and network errors map to a few plain kinds.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { errorKind, SERVER_COPY, serverCopyText } from '../src/lib/error-kind.ts';

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
  assert.equal(errorKind({ code: '42501', message: 'permission denied for table rooms' }), 'notAllowed');
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

test('every allowlisted server message is shown as-is', () => {
  assert.ok(SERVER_COPY.size > 0);
  for (const message of SERVER_COPY) {
    assert.equal(errorKind({ code: 'P0001', message }), 'asIs', message);
    assert.equal(errorKind({ code: '42501', message }), 'asIs', message);
  }
});

test('unlisted server text never passes through', () => {
  assert.equal(errorKind({ code: 'P0001', message: 'Unknown status' }), 'generic');
  assert.equal(errorKind({ code: 'P0001', message: 'Only the host can end this room' }), 'generic');
  assert.equal(SERVER_COPY.has('Not a member of this room'), false);
  assert.equal(errorKind({ code: '42501', message: 'Not a member of this room' }), 'notMember');
});

test('rename: live server texts that still say "Qrewing AI" stay asIs and display as "Trok AI"', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const live = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql'))) {
    for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/raise exception '([^']*Qrew[^']*)'/g)) live.add(m[1]);
  }
  assert.deepEqual([...live].sort(), [
    'Entry info can be required only in an event room with Qrewing AI on',
    'Mute small talk needs Qrewing AI consent',
    'Only the host of an open room can change Qrewing AI',
    'Qrewing AI is off in this room',
  ]);
  for (const message of live) {
    assert.equal(errorKind({ code: 'P0001', message }), 'asIs', message);
    const shown = serverCopyText(message);
    assert.ok(!/Qrew/.test(shown) && /Trok AI/.test(shown), shown);
  }
  assert.equal(serverCopyText('Sign in first'), 'Sign in first');
});
