// Run: npm test (node --test, Node 24 strips the .ts types).
// C-3: a reminder tap returns to the root (dismissing any modal) before pushing the room.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pushFromRoot } from '../src/lib/root-nav.ts';

function fakeRouter(canDismiss) {
  const calls = [];
  return {
    calls,
    canDismiss: () => canDismiss,
    dismissAll: () => calls.push('dismissAll'),
    push: (href) => calls.push(['push', href]),
  };
}

const href = { pathname: '/room/[id]', params: { id: 'r1', from: 'reminder' } };

test('dismisses to the root first when screens or a modal are above Rooms', () => {
  const r = fakeRouter(true);
  pushFromRoot(r, href);
  assert.deepEqual(r.calls, ['dismissAll', ['push', href]]);
});

test('pushes directly when already at the root', () => {
  const r = fakeRouter(false);
  pushFromRoot(r, href);
  assert.deepEqual(r.calls, [['push', href]]);
});
