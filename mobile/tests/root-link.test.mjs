// Run: npm test (node --test, Node 24 strips the .ts types).
// N-1: only the bare root link resets to Rooms; invite links and cold starts pass through.
// P-3: with a modal open, the root link closes it on the way, and a join link opens from the root.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MODAL_ROUTES,
  handleRootLink,
  hasOpenModal,
  isRootLink,
  isSignedOutOnlyLink,
  joinLinkHref,
  roomLinkHref,
  rootLinkPlan,
  setRootLinkHandler,
} from '../src/lib/root-link.ts';

const TOKEN = '0123456789abcdef0123456789abcdef0123';

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

test('join link forms map to the join/[token] href', () => {
  assert.equal(joinLinkHref(`moment://join/${TOKEN}`), `/join/${TOKEN}`);
  assert.equal(joinLinkHref(`moment:///join/${TOKEN}`), `/join/${TOKEN}`);
  assert.equal(joinLinkHref(`MOMENT://JOIN/${TOKEN}`), `/join/${TOKEN}`);
  assert.equal(joinLinkHref(`/join/${TOKEN}`), `/join/${TOKEN}`);
  assert.equal(joinLinkHref(`moment://join/${TOKEN}/`), `/join/${TOKEN}`);
  assert.equal(joinLinkHref(`moment://join/${TOKEN}?x=1#y`), `/join/${TOKEN}`);
  // An unknown token still opens join/[token], which shows the invalid-invite message.
  assert.equal(joinLinkHref('moment://join/not-a-token'), '/join/not-a-token');
});

test('non-join links have no join href', () => {
  for (const p of [
    'moment:///',
    'moment://join',
    'moment://join/',
    `moment://join/${TOKEN}/extra`,
    'moment:///room/1',
    `https://example.com/join/${TOKEN}`,
    'moment://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
    `moment:join/${TOKEN}`,
  ]) {
    assert.equal(joinLinkHref(p), null, p);
  }
});

test('hasOpenModal looks at the active root routes only', () => {
  assert.deepEqual([...MODAL_ROUTES], ['upgrade', 'room/[id]/invite', 'room/[id]/ask', 'room/[id]/questions']);
  assert.equal(hasOpenModal(undefined), false);
  assert.equal(hasOpenModal({ index: 0, routes: [{ name: 'index' }] }), false);
  assert.equal(hasOpenModal({ index: 2, routes: [{ name: 'index' }, { name: 'room/[id]/index' }, { name: 'room/[id]/info' }] }), false);
  assert.equal(hasOpenModal({ index: 2, routes: [{ name: 'index' }, { name: 'room/[id]/index' }, { name: 'room/[id]/invite' }] }), true);
  assert.equal(hasOpenModal({ index: 2, routes: [{ name: 'index' }, { name: 'profile' }, { name: 'upgrade' }] }), true);
  // A screen pushed above a modal is still inside it.
  assert.equal(hasOpenModal({ index: 3, routes: [{ name: 'index' }, { name: 'room/[id]/index' }, { name: 'room/[id]/invite' }, { name: 'preview' }] }), true);
  // A preloaded route above the focused one is not open.
  assert.equal(hasOpenModal({ index: 0, routes: [{ name: 'index' }, { name: 'upgrade' }] }), false);
  // No index: the last route is the focused one.
  assert.equal(hasOpenModal({ routes: [{ name: 'index' }, { name: 'upgrade' }] }), true);
});

test('hasOpenModal follows the nested __root state (shape from the P-3 qa log)', () => {
  const wrap = (index, names) => ({ index: 0, routes: [{ name: '__root', state: { index, routes: names.map((name) => ({ name })) } }] });
  assert.equal(hasOpenModal(wrap(2, ['index', 'room/[id]/index', 'room/[id]/invite'])), true);
  assert.equal(hasOpenModal(wrap(2, ['index', 'profile', 'upgrade'])), true);
  assert.equal(hasOpenModal(wrap(2, ['index', 'room/[id]/index', 'room/[id]/info'])), false);
  assert.equal(hasOpenModal(wrap(0, ['index', 'upgrade'])), false);
  assert.equal(hasOpenModal({ index: 0, routes: [{ name: '__root' }] }), false);
  assert.equal(hasOpenModal({ index: 0, routes: [] }), false);
});

test('plan: root link resets, a join link is taken only with a modal open', () => {
  assert.equal(rootLinkPlan('moment:///', false, true), 'reset');
  assert.equal(rootLinkPlan('moment:///', false, true, true), 'reset');
  assert.equal(rootLinkPlan('moment:///', true, true), 'pass');
  assert.equal(rootLinkPlan('moment:///', false, false), 'pass');
  assert.equal(rootLinkPlan('moment://join/abc', false, true), 'pass');
  assert.equal(rootLinkPlan('moment://join/abc', false, true, false), 'pass');
  assert.equal(rootLinkPlan('moment://join/abc', false, true, true), 'join');
  // Cold start and signed out stay on default handling even with a modal.
  assert.equal(rootLinkPlan('moment://join/abc', true, true, true), 'pass');
  assert.equal(rootLinkPlan('moment://join/abc', false, false, true), 'pass');
  // Other links (not join, not room) are never taken.
  assert.equal(rootLinkPlan('moment:///room/1', false, true, true), 'join'); // UX2-136: a room link also opens from the root
  assert.equal(rootLinkPlan('moment://expo-development-client/?url=x', false, true, true), 'pass');
});

function fakeHandler(modalOpen) {
  const calls = [];
  return {
    calls,
    isModalOpen: () => modalOpen,
    reset: (open) => calls.push(['reset', open]),
    openFromRoot: (href) => calls.push(['openFromRoot', href]),
  };
}

test('no modal: the root link resets (N-1) and a join link passes through', () => {
  const h = fakeHandler(false);
  setRootLinkHandler(h);
  assert.equal(handleRootLink('moment:///', false), true);
  assert.equal(handleRootLink(`moment://join/${TOKEN}`, false), false);
  assert.equal(handleRootLink('moment:///', true), false);
  assert.deepEqual(h.calls, [['reset', false]]);
  setRootLinkHandler(null);
});

test('modal open: the root link resets through it and a join link opens from the root', () => {
  const h = fakeHandler(true);
  setRootLinkHandler(h);
  assert.equal(handleRootLink('moment:///', false), true);
  assert.equal(handleRootLink(`moment://join/${TOKEN}`, false), true);
  // UX2-136: a room link opens from the root too (it was pushed inside the modal as a sheet with no Back).
  assert.equal(handleRootLink('moment:///room/1', false), true);
  assert.equal(handleRootLink(`moment://join/${TOKEN}`, true), false);
  assert.deepEqual(h.calls, [
    ['reset', true],
    ['openFromRoot', `/join/${TOKEN}`],
    ['openFromRoot', '/room/1'],
  ]);
  setRootLinkHandler(null);
});

test('signed out (no handler): every link passes through', () => {
  setRootLinkHandler(null);
  assert.equal(handleRootLink('moment:///', false), false);
  assert.equal(handleRootLink(`moment://join/${TOKEN}`, false), false);
});

test('UX2-135: signed in, a warm link to a signed-out-only screen resets to Rooms (no second Rooms with Back)', () => {
  for (const link of ['moment:///start/code', 'moment://start/code', '/start/code/', 'moment:///start/scan?x=1',
    '/welcome', '/guest', '/sign-in', '/sign-up']) {
    assert.equal(isSignedOutOnlyLink(link), true, link);
    assert.equal(rootLinkPlan(link, false, true), 'reset', link);
    assert.equal(rootLinkPlan(link, false, true, true), 'reset', link);
  }
  // Cold start and signed out (no handler) pass through; other screens are not signed-out-only.
  assert.equal(rootLinkPlan('moment:///start/code', true, true), 'pass');
  assert.equal(rootLinkPlan('moment:///start/code', false, false), 'pass');
  for (const link of ['/start', '/start/code/x', '/join/abc', '/scan', '/profile', 'https://example.com/start/code']) {
    assert.equal(isSignedOutOnlyLink(link), false, link);
  }
});

test('UX2-136: room link forms map to their href; with a modal open (any of the four) they open from the root', () => {
  assert.equal(roomLinkHref('moment:///room/abc'), '/room/abc');
  assert.equal(roomLinkHref('moment://room/abc/'), '/room/abc');
  assert.equal(roomLinkHref('/room/abc/map?x=1'), '/room/abc/map');
  assert.equal(roomLinkHref('moment:///room/abc/media/m1'), '/room/abc/media/m1');
  for (const p of ['/room', '/room/', '/rooms/abc', '/join/abc', 'https://example.com/room/abc', 'moment:room/abc']) {
    assert.equal(roomLinkHref(p), null, p);
  }
  for (const name of ['upgrade', 'room/[id]/invite', 'room/[id]/ask', 'room/[id]/questions']) {
    const state = { index: 2, routes: [{ name: 'index' }, { name: 'room/[id]/index' }, { name }] };
    assert.equal(hasOpenModal(state), true, name);
  }
  assert.equal(rootLinkPlan('moment:///room/abc', false, true, true), 'join');
  // No modal, cold start, or signed out: default handling (a plain push on the root stack already has Back).
  assert.equal(rootLinkPlan('moment:///room/abc', false, true, false), 'pass');
  assert.equal(rootLinkPlan('moment:///room/abc', true, true, true), 'pass');
  assert.equal(rootLinkPlan('moment:///room/abc', false, false, true), 'pass');
});
