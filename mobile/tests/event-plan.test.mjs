// Run: npm test. Qrewing AI event features: entry limits, consent/entry gates, mentions, Mute small talk.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collapseSmallTalk,
  createTriageBatcher,
  linksByUser,
  mentionsName,
  needsDisclosure,
  needsEntry,
  newestMs,
  pickBanner,
  staysVisible,
  validateEntry,
} from '../src/features/event/event-plan.ts';
import { classifyQrewingError, isQrewingError } from '../src/features/event/qrewing-plan.ts';

const entry = (o = {}) => ({ headline: 'CS junior', interests: '', lookingFor: '', links: [], ...o });

test('validateEntry: trims and drops empty links', () => {
  const r = validateEntry(entry({ headline: '  CS junior ', links: [' https://a.dev ', '  '] }));
  assert.deepEqual(r, { value: { headline: 'CS junior', interests: '', lookingFor: '', links: ['https://a.dev'] } });
});

test('validateEntry: spec 1.3 limits', () => {
  assert.deepEqual(validateEntry(entry({ headline: '   ' })), { problem: 'headlineRequired' });
  assert.ok('value' in validateEntry(entry({ headline: 'a'.repeat(80) })));
  assert.deepEqual(validateEntry(entry({ headline: 'a'.repeat(81) })), { problem: 'headlineTooLong' });
  assert.deepEqual(validateEntry(entry({ interests: 'a'.repeat(301) })), { problem: 'interestsTooLong' });
  assert.deepEqual(validateEntry(entry({ lookingFor: 'a'.repeat(301) })), { problem: 'lookingForTooLong' });
  const four = ['https://a.dev', 'https://b.dev', 'https://c.dev', 'https://d.dev'];
  assert.deepEqual(validateEntry(entry({ links: four })), { problem: 'tooManyLinks' });
  assert.deepEqual(validateEntry(entry({ links: ['http://a.dev'] })), { problem: 'linkInvalid' });
  assert.deepEqual(validateEntry(entry({ links: ['https://'] })), { problem: 'linkInvalid' });
  assert.deepEqual(validateEntry(entry({ links: ['https://' + 'a'.repeat(193)] })), { problem: 'linkInvalid' });
  assert.ok('value' in validateEntry(entry({ links: ['https://' + 'a'.repeat(192)] })));
});

test('needsDisclosure: only in an AI room before the member answered', () => {
  assert.equal(needsDisclosure(false, null), false);
  assert.equal(needsDisclosure(true, null), true);
  assert.equal(needsDisclosure(true, { aiOk: false, mute: false }), false);
  assert.equal(needsDisclosure(true, { aiOk: true, mute: false }), false);
});

test('needsEntry: event rooms with entry_required, once we know there is no profile', () => {
  assert.equal(needsEntry(true, 'event', false), true);
  assert.equal(needsEntry(true, 'event', null), false);
  assert.equal(needsEntry(true, 'event', true), false);
  assert.equal(needsEntry(true, 'sports', false), false);
  assert.equal(needsEntry(false, 'event', false), false);
});

test('mentionsName: whole word, case-insensitive, optional @', () => {
  assert.equal(mentionsName('hey Jay, where are you?', 'Jay'), true);
  assert.equal(mentionsName('@jay check this', 'Jay'), true);
  assert.equal(mentionsName('jaywalking is bad', 'Jay'), false);
  assert.equal(mentionsName('Ask Mina Park', 'Mina Park'), true);
  assert.equal(mentionsName('민지 어디야', '민지'), true);
  assert.equal(mentionsName('민지야', '민지'), false);
  assert.equal(mentionsName('a.b', 'a.b'), true);
  assert.equal(mentionsName('axb', 'a.b'), false);
  assert.equal(mentionsName('J is here', 'J'), false);
  assert.equal(mentionsName(null, 'Jay'), false);
  assert.equal(mentionsName('Jay', ''), false);
});

const ME = 'u-me';
const msg = (id, o = {}) => ({ id, kind: 'text', sender_id: 'u-other', body: 'hi', ...o });

test('staysVisible: only others\' plain text can hide', () => {
  const flags = new Map([['m2', { important: true, reason: 'Room moved' }], ['m3', { important: false, reason: null }]]);
  assert.equal(staysVisible(msg('m1'), ME, 'Jay', flags), false);
  assert.equal(staysVisible(msg('m2'), ME, 'Jay', flags), true);
  assert.equal(staysVisible(msg('m3'), ME, 'Jay', flags), false);
  assert.equal(staysVisible(msg('m4', { sender_id: ME }), ME, 'Jay', flags), true);
  assert.equal(staysVisible(msg('m5', { kind: 'arrival' }), ME, 'Jay', flags), true);
  assert.equal(staysVisible(msg('m6', { kind: 'emergency' }), ME, 'Jay', flags), true);
  assert.equal(staysVisible(msg('m7', { body: 'Jay come here' }), ME, 'Jay', flags), true);
});

test('collapseSmallTalk: runs collapse into one row and can expand', () => {
  const items = [msg('a'), msg('b'), msg('c', { sender_id: ME }), msg('d'), msg('e', { sender_id: ME })];
  const visible = (m) => m.sender_id === ME;
  const rows = collapseSmallTalk(items, visible, new Set());
  assert.deepEqual(
    rows.map((r) => (r.type === 'hidden' ? `${r.key}:${r.ids.join(',')}` : r.item.id)),
    ['hidden-b:a,b', 'c', 'hidden-d:d', 'e'],
  );
  const open = collapseSmallTalk(items, visible, new Set(['hidden-b']));
  assert.deepEqual(open.map((r) => (r.type === 'hidden' ? r.key : r.item.id)), ['a', 'b', 'c', 'hidden-d', 'e']);
  // A new message arriving at the front of a newest-first list keeps the run key.
  const more = collapseSmallTalk([msg('z'), ...items], visible, new Set(['hidden-b']));
  assert.deepEqual(more.map((r) => (r.type === 'hidden' ? r.key : r.item.id)), ['z', 'a', 'b', 'c', 'hidden-d', 'e']);
});

function fakeTimers() {
  const timers = new Map();
  let next = 1;
  return {
    setTimer: (fn) => {
      const h = next++;
      timers.set(h, fn);
      return h;
    },
    clearTimer: (h) => timers.delete(h),
    fire: () => {
      const fns = [...timers.values()];
      timers.clear();
      fns.forEach((fn) => fn());
    },
    count: () => timers.size,
  };
}

test('createTriageBatcher: up to 5 per batch, flush after the delay, no duplicates', () => {
  const t = fakeTimers();
  const batches = [];
  const b = createTriageBatcher({ flush: (ids) => batches.push(ids), setTimer: t.setTimer, clearTimer: t.clearTimer });
  b.add('1');
  b.add('1');
  b.add('2');
  assert.equal(t.count(), 1);
  assert.deepEqual(batches, []);
  t.fire();
  assert.deepEqual(batches, [['1', '2']]);
  ['3', '4', '5', '6', '7'].forEach((id) => b.add(id));
  assert.deepEqual(batches[1], ['3', '4', '5', '6', '7']);
  assert.equal(t.count(), 0);
  b.add('8');
  b.cancel();
  t.fire();
  assert.equal(batches.length, 2);
  b.add('2');
  assert.equal(t.count(), 0);
});

test('classifyQrewingError: body code wins, else status', () => {
  assert.equal(classifyQrewingError(403, 'ai_off'), 'ai_off');
  assert.equal(classifyQrewingError(409, 'too_early'), 'too_early');
  assert.equal(classifyQrewingError(503), 'ai_not_configured');
  assert.equal(classifyQrewingError(0), 'network');
  assert.equal(classifyQrewingError(401), 'not_member');
  assert.equal(classifyQrewingError(500, 'boom'), 'ai_failed');
  assert.equal(isQrewingError({ error: 'ai_off' }), true);
  assert.equal(isQrewingError({ ok: true }), false);
});

test('newestMs skips pending rows and returns 0 for none', () => {
  assert.equal(newestMs([]), 0);
  const items = [
    { id: 'p', kind: 'text', sender_id: 'me', body: 'x', created_at: '2026-11-12T10:05:00Z', pending: true },
    { id: 'a', kind: 'text', sender_id: 'u', body: 'x', created_at: '2026-11-12T10:01:00Z' },
    { id: 'b', kind: 'text', sender_id: 'u', body: 'x', created_at: '2026-11-12T10:03:00Z' },
  ];
  assert.equal(newestMs(items), Date.parse('2026-11-12T10:03:00Z'));
});

test('pickBanner: newest important or mention after since, not mine, not dismissed', () => {
  const since = Date.parse('2026-11-12T10:00:00Z');
  const row = (id, sender, body, min) => ({ id, kind: 'text', sender_id: sender, body, created_at: `2026-11-12T10:0${min}:00Z` });
  const items = [
    row('mine', 'me', 'Sam look', 6),
    row('plain', 'u', 'nice weather', 5),
    row('flag', 'u', 'Stage moved to hall B', 4),
    row('mention', 'u', 'hey @Sam', 3),
    row('old', 'u', 'Sam before', 0),
  ];
  const flags = new Map([['flag', { important: true, reason: 'Location change' }], ['plain', { important: false, reason: null }]]);
  const base = { since, userId: 'me', myName: 'Sam', flags, dismissed: new Set() };
  assert.deepEqual(pickBanner(items, base), {
    messageId: 'flag',
    reason: 'Location change',
    mention: false,
    createdMs: Date.parse('2026-11-12T10:04:00Z'),
  });
  const next = pickBanner(items, { ...base, dismissed: new Set(['flag']) });
  assert.equal(next.messageId, 'mention');
  assert.equal(next.mention, true);
  assert.equal(next.reason, null);
  assert.equal(pickBanner(items, { ...base, dismissed: new Set(['flag', 'mention']) }), null);
});

test('linksByUser keeps up to 3 https links per member and skips empty ones', () => {
  const map = linksByUser([
    { user_id: 'a', links: ['https://x.dev', 'http://bad', 'javascript:alert(1)', 'https://y.dev', 'https://z.dev', 'https://w.dev'] },
    { user_id: 'b', links: [] },
    { user_id: 'c', links: null },
  ]);
  assert.deepEqual(map.get('a'), ['https://x.dev', 'https://y.dev', 'https://z.dev']);
  assert.equal(map.has('b'), false);
  assert.equal(map.has('c'), false);
});
