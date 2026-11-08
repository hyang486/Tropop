// Run: npm test (node --test, Node 24 strips the .ts types).
// N-1: only the bare root link resets to Rooms; invite links and cold starts pass through.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleRootLink, isRootLink, rootLinkPlan, setRootLinkHandler } from '../src/lib/root-link.ts';

test('root URL forms are root links', () => {
  for (const p of ['moment:///', 'moment://', 'MOMENT:///', 'moment:///?a=1', 'moment:///#x', '/', '', ' moment:/// ']) {
    assert.equal(isRootLink(p), true, p);
  }
});

test('other links are not root links', () => {
  for (const p of [
    'moment://join/abc123',
    'moment:///join/abc123',
    'moment:///room/1',
    '/join/abc',
    'moment://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
    'https://example.com/',
    'moment:',
  ]) {
    assert.equal(isRootLink(p), false, p);
  }
});

test('plan resets only a non-initial root link with a handler', () => {
  assert.equal(rootLinkPlan('moment:///', false, true), 'reset');
  assert.equal(rootLinkPlan('moment:///', true, true), 'pass');
  assert.equal(rootLinkPlan('moment:///', false, false), 'pass');
  assert.equal(rootLinkPlan('moment://join/abc', false, true), 'pass');
});

test('handleRootLink calls the registered handler once and lets other links through', () => {
  let calls = 0;
  setRootLinkHandler(() => calls++);
  assert.equal(handleRootLink('moment:///', false), true);
  assert.equal(handleRootLink('moment://join/abc', false), false);
  assert.equal(handleRootLink('moment:///', true), false);
  assert.equal(calls, 1);
  setRootLinkHandler(null);
  assert.equal(handleRootLink('moment:///', false), false);
  assert.equal(calls, 1);
});
