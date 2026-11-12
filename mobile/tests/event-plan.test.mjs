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

test('mentionsName: "@" + full name or first word, word-bounded, case-insensitive, NFC', () => {
  assert.equal(mentionsName('@jay check this', 'Jay'), true);
  assert.equal(mentionsName('hey @JAY, where are you?', 'Jay'), true);
  assert.equal(mentionsName('hey Jay, where are you?', 'Jay'), false, 'bare name is not a mention');
  assert.equal(mentionsName('@Bobby is here', 'Bob'), false, 'longer name');
  assert.equal(mentionsName('mail x@bob.com', 'Bob'), false, 'email');
  assert.equal(mentionsName('@@bob', 'Bob'), false);
  assert.equal(mentionsName('(@bob)', 'Bob'), true);
  assert.equal(mentionsName('@bob.', 'Bob'), true, 'sentence end');
  assert.equal(mentionsName('Ask @Mina Park', 'Mina Park'), true, 'full name');
  assert.equal(mentionsName('Ask @mina', 'Mina  Park'), true, 'first word');
  assert.equal(mentionsName('Ask @Park', 'Mina Park'), false, 'last word alone');
  assert.equal(mentionsName('@민지 어디야', '민지'), true);
  assert.equal(mentionsName('@민지야', '민지'), false);
  // NFD "é" (e + U+0301) in the body matches the NFC name, and the reverse.
  assert.equal(mentionsName('@Jose\u0301 hi', 'Jos\u00e9'), true);
  assert.equal(mentionsName('@Jos\u00e9 hi', 'Jose\u0301'), true);
  assert.equal(mentionsName('@a.b', 'a.b'), true);
  assert.equal(mentionsName('@axb', 'a.b'), false);
  assert.equal(mentionsName('@J is here', 'J'), false, 'under 2 characters');
  assert.equal(mentionsName('@J is here', 'J Lee'), false, 'first word under 2 characters');
  assert.equal(mentionsName('@everyone', 'Jay'), false);
  assert.equal(mentionsName(null, 'Jay'), false);
  assert.equal(mentionsName('@Jay', ''), false);
});

const ME = 'u-me';
const msg = (id, o = {}) => ({ id, kind: 'text', sender_id: 'u-other', body: 'hi', ...o });

test('staysVisible: only others\' text judged done and not important can hide', () => {
  const flags = new Map([
    ['done-true', { state: 'done', important: true, reason: 'Room moved' }],
    ['done-false', { state: 'done', important: false, reason: null }],
    ['pending', { state: 'pending', important: false, reason: null }],
    ['skipped', { state: 'skipped', important: false, reason: null }],
  ]);
  assert.equal(staysVisible(msg('done-false'), ME, 'Jay', flags), false, 'done + not important hides');
  assert.equal(staysVisible(msg('done-true'), ME, 'Jay', flags), true, 'done + important stays');
  assert.equal(staysVisible(msg('no-flag'), ME, 'Jay', flags), true, 'never judged stays');
  assert.equal(staysVisible(msg('pending'), ME, 'Jay', flags), true, 'pending stays');
  assert.equal(staysVisible(msg('skipped'), ME, 'Jay', flags), true, 'skipped (not consented, cap) stays');
  assert.equal(staysVisible(msg('done-false', { body: '@Jay come here' }), ME, 'Jay', flags), true, 'mention stays');
  assert.equal(staysVisible(msg('done-false', { body: 'Jay come here' }), ME, 'Jay', flags), false, 'bare name hides');
  assert.equal(staysVisible(msg('done-false', { body: '@Jay come here' }), ME, 'Sam', flags), false, 'mention of someone else hides');
  assert.equal(staysVisible(msg('done-false', { sender_id: ME }), ME, 'Jay', flags), true);
  assert.equal(staysVisible(msg('done-false', { kind: 'arrival' }), ME, 'Jay', flags), true);
  assert.equal(staysVisible(msg('done-false', { kind: 'emergency' }), ME, 'Jay', flags), true);
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
  const flags = new Map([
    ['flag', { state: 'done', important: true, reason: 'Location change' }],
    ['plain', { state: 'done', important: false, reason: null }],
  ]);
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

test('isOfflineError: only a request that never got an answer is offline', async () => {
  const { isOfflineError, saveErrorKind } = await import('../src/features/event/qrewing-plan.ts');
  // Offline: the fetch error itself, or a supabase-js error built from it (message "<name>: <message>").
  assert.equal(isOfflineError(new TypeError('Network request failed')), true);
  assert.equal(isOfflineError({ message: 'TypeError: Network request failed', code: '' }), true);
  assert.equal(isOfflineError({ message: 'AbortError: The user aborted a request.', code: '' }), true);
  assert.equal(isOfflineError({ name: 'AbortError', message: 'Aborted' }), true);
  assert.equal(isOfflineError({ name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }), true);
  // Server failures: gateway 5xx and non-JSON bodies also come back with an empty code.
  assert.equal(isOfflineError({ message: '<html>502 Bad Gateway</html>', code: '' }), false);
  assert.equal(isOfflineError({ message: 'Service Unavailable', code: '' }), false);
  assert.equal(isOfflineError({ message: 'upstream connect error', code: '' }), false);
  assert.equal(isOfflineError({ name: 'FunctionsRelayError', message: 'Relay Error invoking the Edge Function' }), false);
  assert.equal(isOfflineError({ message: 'relation does not exist', code: '42P01' }), false);
  assert.equal(isOfflineError({ message: 'missing table', code: 'PGRST205' }), false);
  assert.equal(isOfflineError(new Error('boom')), false);
  assert.equal(isOfflineError(null), false);
  assert.equal(saveErrorKind({ message: 'TypeError: Network request failed', code: '' }), 'network');
  assert.equal(saveErrorKind({ message: '502 Bad Gateway', code: '' }), 'failed');
  assert.equal(saveErrorKind({ code: 'P0001', message: 'not a member' }), 'failed');
});

test('invokeFailureKind: HTTP errors are read, relay errors are server failures, fetch errors are offline', async () => {
  const { invokeFailureKind } = await import('../src/features/event/qrewing-plan.ts');
  assert.equal(invokeFailureKind({ name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code' }), 'http');
  assert.equal(invokeFailureKind({ name: 'FunctionsRelayError', message: 'Relay Error' }), 'server');
  assert.equal(invokeFailureKind({ name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }), 'network');
  assert.equal(invokeFailureKind(new TypeError('Network request failed')), 'network');
  assert.equal(invokeFailureKind(new Error('boom')), 'server');
});
