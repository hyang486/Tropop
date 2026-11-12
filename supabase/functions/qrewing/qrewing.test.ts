// Run: node --test supabase/functions/qrewing/   (Node 24 strips types; no network, no Anthropic key)
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compactPerson,
  handle,
  MATCH_FIELD_MAX,
  MATCH_MAX_CANDIDATES,
  matchCandidates,
  parseBody,
  prefilterTriage,
  PREFILTER_REASON,
  RECAP_WINDOW_MS,
  TRIAGE_DAILY_CAP,
  type Consent,
  type EntryProfile,
  type MatchRow,
  type Model,
  type ModelRequest,
  type ModelResult,
  type Msg,
  type QrewingStore,
  type RecapRow,
  type RoomInfo,
  type StoredMatch,
  type TriageRow,
} from './core.ts';
import { cut, esc, recapRefreshUser, triageUser } from './prompts.ts';

const NOW = new Date('2026-11-12T20:00:00.000Z');
const ROOM = '11111111-1111-4111-8111-111111111111';
const HOST = 'aaaaaaaa-0000-4000-8000-000000000001';
const BOB = 'aaaaaaaa-0000-4000-8000-000000000002';
const CAT = 'aaaaaaaa-0000-4000-8000-000000000003';
const OUT = 'aaaaaaaa-0000-4000-8000-000000000009';
const mid = (n: number) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, '0')}`;
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const MIN = 60_000;

type World = {
  room: RoomInfo | null;
  members: string[];
  aiEnabled: boolean;
  consents: Map<string, Consent>;
  names: Map<string, string>;
  messages: Msg[];
  triage: Map<string, TriageRow & { roomId: string; createdAt: string; source?: 'model' | 'rule' }>;
  recap: RecapRow | null;
  entries: EntryProfile[];
  matches: Map<string, MatchRow>;
  usage: { action: string; model: string }[];
  writes: number;
};

function world(over: Partial<World> = {}): World {
  return {
    room: {
      id: ROOM,
      name: 'Bay run',
      type: 'event',
      hostId: HOST,
      expiresAt: iso(5 * 3600_000),
      deletedAt: null,
      graceUntil: null,
      placeName: 'Lake Merritt',
      startsAt: iso(-3600_000),
    },
    members: [HOST, BOB, CAT],
    aiEnabled: true,
    consents: new Map([
      [HOST, { aiOk: true, mute: false }],
      [BOB, { aiOk: true, mute: true }],
      [CAT, { aiOk: true, mute: false }],
    ]),
    names: new Map([
      [HOST, 'Hana'],
      [BOB, 'Bob'],
      [CAT, 'Cat'],
    ]),
    messages: [],
    triage: new Map(),
    recap: null,
    entries: [],
    matches: new Map(),
    usage: [],
    writes: 0,
    ...over,
  };
}

function msg(n: number, sender: string | null, body: string, minutesAgo: number, kind = 'text', roomId = ROOM): Msg {
  return { id: mid(n), roomId, kind, senderId: sender, body, createdAt: iso(-minutesAgo * MIN) };
}

function store(w: World): QrewingStore {
  const text = (desc = true) =>
    w.messages.filter((m) => m.kind === 'text').sort((a, b) => (desc ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  return {
    async room(id) {
      return w.room && w.room.id === id ? w.room : null;
    },
    async isMember(_r, u) {
      return w.members.includes(u);
    },
    async aiEnabled() {
      return w.aiEnabled;
    },
    async consents() {
      return w.consents;
    },
    async memberIds() {
      return w.members;
    },
    async displayNames(ids) {
      return new Map(ids.filter((i) => w.names.has(i)).map((i) => [i, w.names.get(i)!]));
    },
    async messagesByIds(ids) {
      return w.messages.filter((m) => ids.includes(m.id));
    },
    async textBefore(roomId, before, limit) {
      return text().filter((m) => m.roomId === roomId && m.createdAt < before).slice(0, limit);
    },
    async latestText(roomId, limit) {
      return text().filter((m) => m.roomId === roomId).slice(0, limit);
    },
    async textAfter(roomId, after, limit) {
      return text().filter((m) => m.roomId === roomId && m.createdAt > after).slice(0, limit);
    },
    async mediaCounts() {
      return { photos: 4, videos: 1 };
    },
    async triageRows(ids) {
      return ids.filter((i) => w.triage.has(i)).map((i) => w.triage.get(i)!);
    },
    async triageCountSince(roomId, since) {
      return [...w.triage.values()].filter((r) => r.roomId === roomId && r.state !== 'skipped' && r.source !== 'rule' && r.createdAt >= since).length;
    },
    async skipTriage(roomId, ids) {
      for (const id of ids) {
        if (w.triage.has(id)) continue;
        w.writes++;
        w.triage.set(id, { messageId: id, roomId, state: 'skipped', important: false, reason: null, updatedAt: NOW.toISOString(), createdAt: NOW.toISOString() });
      }
    },
    async claimTriage(roomId, ids, staleBefore) {
      const mine: string[] = [];
      for (const id of ids) {
        const r = w.triage.get(id);
        if (!r || (r.state === 'pending' && r.updatedAt < staleBefore)) {
          w.writes++;
          w.triage.set(id, { messageId: id, roomId, state: 'pending', important: null, reason: null, updatedAt: NOW.toISOString(), createdAt: r?.createdAt ?? NOW.toISOString() });
          mine.push(id);
        }
      }
      return mine;
    },
    async finishTriage(id, r) {
      const row = w.triage.get(id)!;
      w.triage.set(id, { ...row, ...r });
    },
    async releaseTriage(ids) {
      for (const id of ids) if (w.triage.get(id)?.state === 'pending') w.triage.delete(id);
    },
    async recap() {
      return w.recap;
    },
    async claimRecap(_roomId, staleBefore) {
      if (!w.recap || w.recap.state === 'failed' || (w.recap.state === 'pending' && w.recap.updatedAt < staleBefore)) {
        w.writes++;
        w.recap = { state: 'pending', title: null, summary: null, highlights: null, updatedAt: NOW.toISOString(), refreshedAt: null };
        return true;
      }
      return false;
    },
    async finishRecap(_roomId, r) {
      w.recap =
        r.state === 'done'
          ? { state: 'done', title: r.title, summary: r.summary, highlights: r.highlights, updatedAt: NOW.toISOString(), refreshedAt: null }
          : { state: 'failed', title: null, summary: null, highlights: null, updatedAt: NOW.toISOString(), refreshedAt: null };
      return w.recap;
    },
    async claimRecapRefresh() {
      if (w.recap?.state !== 'done' || w.recap.refreshedAt !== null) return false;
      w.recap = { ...w.recap, refreshedAt: NOW.toISOString(), updatedAt: NOW.toISOString() };
      return true;
    },
    async saveRecapRefresh(_roomId, r) {
      w.recap = { ...w.recap!, ...r, updatedAt: NOW.toISOString() };
      return w.recap;
    },
    async entryProfiles() {
      return w.entries;
    },
    async match(_r, u) {
      return w.matches.get(u) ?? null;
    },
    async saveMatch(_r, u, inputHash, matches: StoredMatch[]) {
      w.matches.set(u, { inputHash, matches, createdAt: NOW.toISOString() });
      return NOW.toISOString();
    },
    async logUsage(_r, action, model) {
      w.usage.push({ action, model });
    },
  };
}

function model(reply: (req: ModelRequest) => Partial<ModelResult> | Error) {
  const calls: ModelRequest[] = [];
  const m: Model = {
    async call(req) {
      calls.push(req);
      const r = reply(req);
      if (r instanceof Error) throw r;
      return { stopReason: 'end_turn', text: '{}', inputTokens: 100, outputTokens: 20, ...r };
    },
  };
  return { m, calls };
}

const run = (w: World, m: Model | null, user: string, body: unknown) => handle({ store: store(w), model: m, now: () => NOW }, user, body);

// ------------------------------------------------------------------------------------------- parse / gates

test('parseBody accepts the contract shapes and rejects the rest', () => {
  assert.deepEqual(parseBody({ action: 'probe' }), { action: 'probe', roomId: null });
  assert.deepEqual(parseBody({ action: 'recap', roomId: ROOM }), { action: 'recap', roomId: ROOM, refresh: false });
  assert.deepEqual(parseBody({ action: 'recap', roomId: ROOM, refresh: true }), { action: 'recap', roomId: ROOM, refresh: true });
  assert.equal(parseBody({ action: 'recap', roomId: ROOM, refresh: 'yes' }), null);
  assert.deepEqual(parseBody({ action: 'triage', roomId: ROOM, messageIds: [mid(1), mid(1)] }), { action: 'triage', roomId: ROOM, messageIds: [mid(1)] });
  assert.equal(parseBody({ action: 'triage', roomId: ROOM, messageIds: [] }), null);
  assert.equal(parseBody({ action: 'triage', roomId: ROOM, messageIds: [1, 2, 3, 4, 5, 6].map(mid) }), null);
  assert.equal(parseBody({ action: 'triage', roomId: ROOM, messageIds: ['x'] }), null);
  assert.equal(parseBody({ action: 'match', roomId: 'nope' }), null);
  assert.equal(parseBody({ action: 'other', roomId: ROOM }), null);
  assert.equal(parseBody(null), null);
  assert.equal(parseBody([]), null);
});

test('order: 400 before 503 before 403; no key = 503 with no DB write', async () => {
  const w = world();
  assert.deepEqual(await run(w, null, BOB, { action: 'nope' }), { status: 400, body: { error: 'bad_request' } });
  assert.deepEqual(await run(w, null, OUT, { action: 'recap', roomId: ROOM }), { status: 503, body: { error: 'ai_not_configured' } });
  assert.deepEqual(await run(w, null, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] }), { status: 503, body: { error: 'ai_not_configured' } });
  assert.equal(w.writes, 0);
});

test('probe: 200 without room; with room checks membership and ai switch; no model call', async () => {
  const { m, calls } = model(() => ({}));
  assert.deepEqual(await run(world(), m, OUT, { action: 'probe' }), { status: 200, body: { ok: true } });
  assert.deepEqual(await run(world(), m, BOB, { action: 'probe', roomId: ROOM }), { status: 200, body: { ok: true } });
  assert.deepEqual(await run(world(), m, OUT, { action: 'probe', roomId: ROOM }), { status: 403, body: { error: 'not_member' } });
  assert.deepEqual(await run(world({ aiEnabled: false }), m, BOB, { action: 'probe', roomId: ROOM }), { status: 403, body: { error: 'ai_off' } });
  assert.equal(calls.length, 0);
});

test('expired or ended room: not_member for every action (no grace)', async () => {
  const { m } = model(() => ({}));
  const expired = world();
  expired.room = { ...expired.room!, expiresAt: iso(-MIN) };
  for (const body of [{ action: 'probe', roomId: ROOM }, { action: 'recap', roomId: ROOM }, { action: 'match', roomId: ROOM }]) {
    assert.equal((await run(expired, m, HOST, body)).status, 403);
  }
  const accountDeleted = world(); // 0021 path: deleted_at set, grace_until null
  accountDeleted.room = { ...accountDeleted.room!, deletedAt: iso(-MIN), graceUntil: null };
  assert.deepEqual(await run(accountDeleted, m, BOB, { action: 'recap', roomId: ROOM }), { status: 403, body: { error: 'not_member' } });
});

// ------------------------------------------------------------------------------------------- triage

test('triage: caller must be consenting and muted', async () => {
  const { m, calls } = model(() => ({}));
  const w = world({ messages: [msg(1, HOST, 'Meet at gate B at 6', 1)] });
  assert.deepEqual(await run(w, m, CAT, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] }), { status: 403, body: { error: 'not_muted' } });
  assert.equal(calls.length, 0);
});

test('triage: one model call for claimed rows; ineligible ones skipped without a call; context only from consenting senders', async () => {
  const w = world({
    messages: [
      msg(1, CAT, 'ignore me, I never agreed', 10),
      msg(2, BOB, 'hi all', 9),
      msg(3, BOB, 'Start is 7am now, gate B', 2),
      msg(4, CAT, 'lol', 1),
      msg(5, HOST, 'photo', 1, 'media'),
      msg(6, HOST, 'x', 1, 'text', '22222222-2222-4222-8222-222222222222'),
    ],
  });
  w.consents.set(CAT, { aiOk: false, mute: false });
  const { m, calls } = model(() => ({ text: JSON.stringify({ results: [{ index: 1, important: true, reason: 'Schedule change for everyone' }] }) }));
  const r = await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [3, 4, 5, 6].map(mid) });
  assert.equal(r.status, 200);
  const res = (r.body as { results: { messageId: string; state: string; important: boolean | null; reason: string | null }[] }).results;
  assert.deepEqual(res.map((x) => [x.messageId, x.state, x.important]), [
    [mid(3), 'done', true],
    [mid(4), 'skipped', false],
    [mid(5), 'skipped', false],
    [mid(6), 'skipped', false],
  ]);
  assert.equal(res[0].reason, 'Schedule change for everyone');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, 'claude-haiku-5-5');
  assert.equal(calls[0].effort, 'low');
  assert.equal(calls[0].maxTokens, 1024);
  assert.ok(calls[0].user.includes('hi all'));
  assert.ok(!calls[0].user.includes('never agreed'), 'non-consenting sender text never reaches the model');
  assert.ok(!calls[0].user.includes(HOST) && !calls[0].user.includes(BOB), 'no user ids in the prompt');
  assert.ok(calls[0].user.includes('sender_is_host="false"'));
  assert.equal(w.triage.has(mid(6)), false, 'other-room ids are not written');
  assert.deepEqual(w.usage, [{ action: 'triage', model: 'claude-haiku-5-5' }]);
});

test('triage: existing rows are returned; a fresh pending claim stays pending; a stale one is retaken', async () => {
  const w = world({ messages: [msg(1, BOB, 'Bring water', 3), msg(2, BOB, 'Bus at 5', 2), msg(3, BOB, 'Gate C', 1)] });
  const row = (id: string, state: TriageRow['state'], updatedAt: string) => ({ messageId: id, roomId: ROOM, state, important: state === 'done' ? true : null, reason: state === 'done' ? 'old' : null, updatedAt, createdAt: updatedAt });
  w.triage.set(mid(1), row(mid(1), 'done', iso(-MIN)));
  w.triage.set(mid(2), row(mid(2), 'pending', iso(-MIN)));
  w.triage.set(mid(3), row(mid(3), 'pending', iso(-10 * MIN)));
  const { m, calls } = model(() => ({ text: JSON.stringify({ results: [{ index: 1, important: false, reason: 'Place detail' }] }) }));
  const r = await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [1, 2, 3].map(mid) });
  const res = (r.body as { results: { state: string; reason: string | null }[] }).results;
  assert.deepEqual(res.map((x) => x.state), ['done', 'pending', 'done']);
  assert.equal(res[0].reason, 'old');
  assert.equal(calls.length, 1);
  assert.ok(calls[0].user.includes('<message>Gate C</message>') && !calls[0].user.includes('<message>Bus at 5</message>'));
});

test('triage: daily cap skips without a model call', async () => {
  const w = world({ messages: [msg(1, BOB, 'Gate B', 1)] });
  for (let i = 0; i < TRIAGE_DAILY_CAP; i++) {
    w.triage.set(`cap-${i}`, { messageId: `cap-${i}`, roomId: ROOM, state: 'done', important: false, reason: null, updatedAt: iso(-MIN), createdAt: iso(-MIN) });
  }
  const { m, calls } = model(() => ({}));
  const r = await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] });
  assert.equal((r.body as { results: { state: string }[] }).results[0].state, 'skipped');
  assert.equal(calls.length, 0);
});

test('triage: API error releases the claims; refusal marks them skipped; both 502', async () => {
  const w = world({ messages: [msg(1, BOB, 'Gate B', 1)] });
  const err = Object.assign(new Error('boom'), { status: 529 });
  assert.deepEqual(await run(w, model(() => err).m, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] }), { status: 502, body: { error: 'ai_failed' } });
  assert.equal(w.triage.has(mid(1)), false);
  assert.deepEqual(w.usage, [], 'no usage logged when the call threw');
  assert.equal((await run(w, model(() => ({ stopReason: 'refusal' })).m, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] })).status, 502);
  assert.equal(w.triage.get(mid(1))?.state, 'skipped');
  assert.equal(w.usage.length, 1, 'usage logged for a completed (refused) call');
});

test('triage: indexes the model left out end skipped', async () => {
  const w = world({ messages: [msg(1, BOB, 'Gate B', 2), msg(2, BOB, 'Gate C', 1)] });
  const { m } = model(() => ({ text: JSON.stringify({ results: [{ index: 2, important: true, reason: 'x' }, { index: 9, important: true, reason: 'y' }] }) }));
  const r = await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1), mid(2)] });
  assert.deepEqual((r.body as { results: { state: string }[] }).results.map((x) => x.state), ['skipped', 'done']);
});

test('prefilterTriage: table (important first, then small talk, everything else to the model)', () => {
  const names = ['Hana Kim', 'Bob', 'Cat'];
  const cases: [string, boolean, string | null, boolean | null][] = [
    // [body, senderIsHost, expected reason, expected important] (null = model)
    ['ok', true, PREFILTER_REASON.host, true],
    ['Bring water', true, PREFILTER_REASON.host, true],
    ['@Bob are you coming?', false, PREFILTER_REASON.mention, true],
    ['can you wait @hana', false, PREFILTER_REASON.mention, true],
    ['@Hana Kim the bus is here', false, PREFILTER_REASON.mention, true],
    ['@all bus leaves now', false, PREFILTER_REASON.mention, true],
    ['email me at bob@bobby.example', false, null, null],
    ['@Bobby hi', false, null, null],
    ['Announcement: bus at 5', false, PREFILTER_REASON.announcement, true],
    ['hey EVERYONE look', false, PREFILTER_REASON.announcement, true],
    ['urgent, lost my keys', false, PREFILTER_REASON.announcement, true],
    ['Meet at gate B', false, PREFILTER_REASON.announcement, true],
    ['Race starts at 7', false, PREFILTER_REASON.announcement, true],
    ['Dinner moved to 8pm', false, PREFILTER_REASON.announcement, true],
    ['ok', false, PREFILTER_REASON.smallTalk, false],
    ['OK!!', false, PREFILTER_REASON.smallTalk, false],
    ['okkk', false, PREFILTER_REASON.smallTalk, false],
    ['lol', false, PREFILTER_REASON.smallTalk, false],
    ['Thanks!', false, PREFILTER_REASON.smallTalk, false],
    ['thank you 🙏', false, PREFILTER_REASON.smallTalk, false],
    ['hahaha', false, PREFILTER_REASON.smallTalk, false],
    ['👍', false, PREFILTER_REASON.smallTalk, false],
    ['🔥🔥 👏🏽', false, PREFILTER_REASON.smallTalk, false],
    ['🇰🇷', false, PREFILTER_REASON.smallTalk, false],
    ['ok but where is the bus', false, null, null],
    ['lol the bus left without us', false, null, null],
    ['7', false, null, null],
    ['Where do we park?', false, null, null],
    ['공지: 7시에 정문에서 모여요', false, null, null],
    ['ㅋㅋㅋ', false, null, null],
    ['   ', false, null, null],
  ];
  for (const [body, host, reason, important] of cases) {
    const r = prefilterTriage({ body, senderIsHost: host, memberNames: names });
    assert.deepEqual(r && [r.reason, r.important], reason === null ? null : [reason, important], body);
  }
});

test('triage: prefilter decides without a model call, writes done rows with source rule, and does not use the cap', async () => {
  const w = world({
    messages: [
      msg(1, HOST, 'Bring water', 5),
      msg(2, CAT, '@bob wait for me', 4),
      msg(3, CAT, '👍', 3),
      msg(4, CAT, 'Where do we park?', 2),
      msg(5, CAT, 'thanks', 1),
    ],
  });
  for (let i = 0; i < TRIAGE_DAILY_CAP - 1; i++) {
    w.triage.set(`cap-${i}`, { messageId: `cap-${i}`, roomId: ROOM, state: 'done', important: false, reason: null, updatedAt: iso(-MIN), createdAt: iso(-MIN) });
  }
  const { m, calls } = model(() => ({ text: JSON.stringify({ results: [{ index: 1, important: false, reason: 'Question' }] }) }));
  const r = await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [1, 2, 3, 4, 5].map(mid) });
  assert.equal(r.status, 200);
  const res = (r.body as { results: { messageId: string; state: string; important: boolean | null; reason: string | null }[] }).results;
  assert.deepEqual(res.map((x) => [x.state, x.important, x.reason]), [
    ['done', true, PREFILTER_REASON.host],
    ['done', true, PREFILTER_REASON.mention],
    ['done', false, PREFILTER_REASON.smallTalk],
    ['done', false, 'Question'],
    ['done', false, PREFILTER_REASON.smallTalk],
  ]);
  assert.equal(calls.length, 1, 'one model call, for the one message the rules left');
  assert.ok(calls[0].user.includes('<message>Where do we park?</message>'));
  assert.ok(!calls[0].user.includes('<message>Bring water</message>'));
  assert.deepEqual([1, 2, 3, 5].map((n) => w.triage.get(mid(n))?.source), ['rule', 'rule', 'rule', 'rule']);
  assert.equal(w.triage.get(mid(4))?.source, 'model');
  assert.equal(w.usage.length, 1);

  // The cap is now full (299 + 1 model row); rule decisions still work, the model is not called.
  w.messages.push(msg(6, CAT, 'lol', 0), msg(7, CAT, 'Is there parking?', 0));
  const r2 = await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [6, 7].map(mid) });
  assert.deepEqual((r2.body as { results: { state: string }[] }).results.map((x) => x.state), ['done', 'skipped']);
  assert.equal(calls.length, 1);
});

test('triage: prefilter reads member names only when a candidate has an @', async () => {
  const w = world({ messages: [msg(1, CAT, 'lol', 1)] });
  const s = store(w);
  let nameReads = 0;
  const counted: QrewingStore = { ...s, displayNames: (ids) => (nameReads++, s.displayNames(ids)) };
  const { m } = model(() => ({}));
  await handle({ store: counted, model: m, now: () => NOW }, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] });
  assert.equal(nameReads, 0);
});

// ------------------------------------------------------------------------------------------- recap

const RECAP_OUT = JSON.stringify({ title: 'Sunrise run', summary: 'We ran around the lake and met at gate B.', highlights: ['Start moved to 7', '', 'Coffee after'] });

test('recap: too early for a member of an open room more than 60 minutes before the end', async () => {
  const { m, calls } = model(() => ({}));
  const r = await run(world(), m, BOB, { action: 'recap', roomId: ROOM });
  assert.equal(r.status, 409);
  assert.equal((r.body as { error: string }).error, 'too_early');
  assert.equal((r.body as { availableAt: string }).availableAt, iso(5 * 3600_000 - RECAP_WINDOW_MS));
  assert.equal(calls.length, 0);
});

test('recap: host may ask any time; consenting text only; cached afterwards', async () => {
  const w = world({ messages: [msg(1, HOST, 'Start at 7', 30), msg(2, CAT, 'secret plans', 20), msg(3, BOB, 'See you there', 10)] });
  w.consents.set(CAT, { aiOk: false, mute: false });
  const { m, calls } = model(() => ({ text: RECAP_OUT }));
  const r = await run(w, m, HOST, { action: 'recap', roomId: ROOM });
  assert.equal(r.status, 200);
  const b = r.body as { state: string; title: string; highlights: string[]; cached: boolean };
  assert.equal(b.state, 'done');
  assert.equal(b.cached, false);
  assert.deepEqual(b.highlights, ['Start moved to 7', 'Coffee after']);
  assert.equal(calls[0].model, 'claude-sonnet-5-5');
  assert.equal(calls[0].effort, 'medium');
  assert.equal(calls[0].maxTokens, 2048);
  assert.ok(calls[0].user.includes('Hana: Start at 7') && calls[0].user.includes('Bob: See you there'));
  assert.ok(!calls[0].user.includes('secret plans'));
  assert.ok(calls[0].user.includes('photos="4"') && calls[0].user.includes('Lake Merritt'));
  const again = await run(w, m, BOB, { action: 'recap', roomId: ROOM }); // BOB too early, but…
  assert.equal(again.status, 409, 'timing is checked before the cache for non-hosts');
  const w2 = world({ recap: w.recap });
  w2.room = { ...w2.room!, expiresAt: iso(30 * MIN) };
  const cached = await run(w2, m, BOB, { action: 'recap', roomId: ROOM });
  assert.equal((cached.body as { cached: boolean }).cached, true);
  assert.equal(calls.length, 1);
});

test('recap: member allowed within the last 60 minutes; pending → 202; failure → failed + 502', async () => {
  const w = world();
  w.room = { ...w.room!, expiresAt: iso(59 * MIN) };
  w.recap = { state: 'pending', title: null, summary: null, highlights: null, updatedAt: iso(-MIN), refreshedAt: null };
  const { m, calls } = model(() => ({ stopReason: 'max_tokens' }));
  assert.deepEqual(await run(w, m, BOB, { action: 'recap', roomId: ROOM }), { status: 202, body: { state: 'pending' } });
  assert.equal(calls.length, 0);
  w.recap = { ...w.recap, updatedAt: iso(-10 * MIN) }; // stale claim is retaken
  assert.deepEqual(await run(w, m, BOB, { action: 'recap', roomId: ROOM }), { status: 502, body: { error: 'ai_failed' } });
  assert.equal(w.recap?.state, 'failed');
});

test('grace (host ended early): recap allowed for members; triage, match and probe are not', async () => {
  const w = world({ messages: [msg(1, HOST, 'Thanks all', 1)] });
  w.room = { ...w.room!, deletedAt: iso(-MIN), graceUntil: iso(29 * MIN) };
  const { m, calls } = model(() => ({ text: RECAP_OUT }));
  assert.equal((await run(w, m, BOB, { action: 'recap', roomId: ROOM })).status, 200, 'non-host, hours before expires_at, but in grace');
  assert.equal(calls.length, 1);
  assert.deepEqual(await run(w, m, BOB, { action: 'probe', roomId: ROOM }), { status: 403, body: { error: 'not_member' } });
  assert.deepEqual(await run(w, m, BOB, { action: 'triage', roomId: ROOM, messageIds: [mid(1)] }), { status: 403, body: { error: 'not_member' } });
  assert.deepEqual(await run(w, m, BOB, { action: 'match', roomId: ROOM }), { status: 403, body: { error: 'not_member' } });
  assert.deepEqual(await run(w, m, OUT, { action: 'recap', roomId: ROOM }), { status: 403, body: { error: 'not_member' } });
  const off = world({ aiEnabled: false });
  off.room = { ...w.room };
  assert.deepEqual(await run(off, m, BOB, { action: 'recap', roomId: ROOM }), { status: 403, body: { error: 'ai_off' } });
  const over = world();
  over.room = { ...w.room, graceUntil: iso(-MIN) };
  assert.deepEqual(await run(over, m, BOB, { action: 'recap', roomId: ROOM }), { status: 403, body: { error: 'not_member' } });
});

test('recap refresh: once, only with newer consenting messages, 50 newest, max_tokens 1024', async () => {
  const w = world();
  w.room = { ...w.room!, expiresAt: iso(8 * MIN) };
  w.recap = { state: 'done', title: 'Run', summary: 'We ran.', highlights: ['Gate B'], updatedAt: iso(-40 * MIN), refreshedAt: null };
  w.messages = [msg(1, HOST, 'before the recap', 50), msg(2, CAT, 'hidden', 5)];
  w.consents.set(CAT, { aiOk: false, mute: false });
  const { m, calls } = model(() => ({ text: JSON.stringify({ title: 'Run, then coffee', summary: 'We ran and got coffee.', highlights: ['Gate B', 'Coffee'] }) }));

  // No newer consenting message: cached, no call, refresh not spent.
  let r = await run(w, m, BOB, { action: 'recap', roomId: ROOM, refresh: true });
  assert.equal((r.body as { cached: boolean }).cached, true);
  assert.equal(calls.length, 0);
  assert.equal(w.recap?.refreshedAt, null);

  for (let i = 0; i < 60; i++) w.messages.push(msg(100 + i, BOB, `m${i}`, 30 - i * 0.1));
  r = await run(w, m, BOB, { action: 'recap', roomId: ROOM, refresh: true });
  assert.equal(r.status, 200);
  assert.equal((r.body as { title: string; cached: boolean }).title, 'Run, then coffee');
  assert.equal((r.body as { cached: boolean }).cached, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].maxTokens, 1024);
  assert.equal(calls[0].model, 'claude-sonnet-5-5');
  assert.equal((calls[0].user.match(/^Bob: m\d+$/gm) ?? []).length, 50);
  assert.ok(calls[0].user.includes('Bob: m59') && !calls[0].user.includes('Bob: m9\n'), 'the 50 newest');
  assert.ok(calls[0].user.includes('<summary>We ran.</summary>') && !calls[0].user.includes('hidden'));
  assert.notEqual(w.recap?.refreshedAt, null);

  w.messages.push(msg(999, BOB, 'later still', 0));
  r = await run(w, m, BOB, { action: 'recap', roomId: ROOM, refresh: true });
  assert.equal((r.body as { cached: boolean }).cached, true);
  assert.equal(calls.length, 1, 'second refresh makes no call');
});

test('recap refresh: a failed refresh keeps the previous recap and is spent', async () => {
  const w = world({ messages: [msg(1, BOB, 'new', 1)] });
  w.room = { ...w.room!, expiresAt: iso(8 * MIN) };
  w.recap = { state: 'done', title: 'Run', summary: 'We ran.', highlights: [], updatedAt: iso(-40 * MIN), refreshedAt: null };
  const { m } = model(() => ({ stopReason: 'refusal' }));
  assert.equal((await run(w, m, BOB, { action: 'recap', roomId: ROOM, refresh: true })).status, 502);
  assert.equal(w.recap?.state, 'done');
  assert.equal(w.recap?.title, 'Run');
  assert.notEqual(w.recap?.refreshedAt, null);
});

test('recap refresh with no done row is a normal recap request', async () => {
  const w = world({ messages: [msg(1, BOB, 'hello', 1)] });
  w.room = { ...w.room!, expiresAt: iso(8 * MIN) };
  const { m, calls } = model(() => ({ text: RECAP_OUT }));
  const r = await run(w, m, BOB, { action: 'recap', roomId: ROOM, refresh: true });
  assert.equal(r.status, 200);
  assert.equal(calls[0].maxTokens, 2048);
});

// ------------------------------------------------------------------------------------------- match

const entry = (userId: string, headline: string, updatedAt = iso(-MIN)): EntryProfile => ({ userId, headline, interests: 'ML, running', lookingFor: 'internship', updatedAt });

test('match: needs consent and an entry; no candidates → empty without a call', async () => {
  const { m, calls } = model(() => ({}));
  assert.deepEqual(await run(world(), m, BOB, { action: 'match', roomId: ROOM }), { status: 409, body: { error: 'no_entry' } });
  const w = world({ entries: [entry(BOB, 'CS junior')] });
  const r = await run(w, m, BOB, { action: 'match', roomId: ROOM });
  assert.deepEqual((r.body as { matches: unknown[] }).matches, []);
  assert.equal(calls.length, 0);
});

test('match: p# mapped back, unknown dropped, score clamped, top 5; cached by hash; stale within 10 minutes', async () => {
  const w = world({ entries: [entry(BOB, 'CS junior'), entry(HOST, 'Recruiter at Acme'), entry(CAT, 'PhD student')] });
  const { m, calls } = model(() => ({
    text: JSON.stringify({ matches: [{ person: 'p9', reason: 'ghost', score: 5 }, { person: 'p1', reason: 'Hiring interns in ML', score: 9 }, { person: 'p2', reason: 'Also runs', score: 0 }] }),
  }));
  const r = await run(w, m, BOB, { action: 'match', roomId: ROOM });
  const b = r.body as { matches: { userId: string; displayName: string; headline: string; score: number }[]; cached: boolean };
  // Candidates are sorted by user id: HOST (…01) = p1, CAT (…03) = p2.
  assert.deepEqual(b.matches.map((x) => [x.userId, x.displayName, x.score]), [[HOST, 'Hana', 5], [CAT, 'Cat', 1]]);
  assert.equal(b.cached, false);
  assert.ok(!calls[0].user.includes(HOST) && !calls[0].user.includes('https://'));
  assert.equal(calls[0].maxTokens, 2048);

  assert.equal(((await run(w, m, BOB, { action: 'match', roomId: ROOM })).body as { cached: boolean }).cached, true);
  w.entries[2] = entry(CAT, 'Postdoc'); // inputs changed, row is young → stale
  const s = (await run(w, m, BOB, { action: 'match', roomId: ROOM })).body as { stale?: boolean };
  assert.equal(s.stale, true);
  assert.equal(calls.length, 1);
  w.matches.set(BOB, { ...w.matches.get(BOB)!, createdAt: iso(-11 * MIN) });
  await run(w, m, BOB, { action: 'match', roomId: ROOM });
  assert.equal(calls.length, 2, 'older than 10 minutes → recomputed');
});

test('match: a cached person who withdrew consent or left is not returned', async () => {
  const w = world({ entries: [entry(BOB, 'CS junior'), entry(HOST, 'Recruiter')] });
  const { m } = model(() => ({ text: JSON.stringify({ matches: [{ person: 'p1', reason: 'Hiring', score: 4 }] }) }));
  await run(w, m, BOB, { action: 'match', roomId: ROOM });
  w.consents.set(HOST, { aiOk: false, mute: false });
  w.matches.set(BOB, { ...w.matches.get(BOB)!, createdAt: iso(-MIN) });
  const r = (await run(w, m, BOB, { action: 'match', roomId: ROOM })).body as { matches: unknown[] };
  assert.deepEqual(r.matches, []);
});

test('matchCandidates: cap keeps the newest entries, ordered by user id; non-members and non-consenting left out', () => {
  const ids = Array.from({ length: 40 }, (_, i) => `aaaaaaaa-0000-4000-8000-${String(100 + i).padStart(12, '0')}`);
  const profiles = ids.map((id, i) => entry(id, `h${i}`, iso(-(40 - i) * MIN))); // later index = newer
  const members = new Set([BOB, ...ids.slice(0, 39)]); // ids[39] (newest) left the room
  const consents = new Map<string, Consent>(ids.map((id) => [id, { aiOk: true, mute: false }]));
  consents.set(ids[38], { aiOk: false, mute: false }); // second newest withdrew
  const out = matchCandidates([entry(BOB, 'me'), ...profiles], BOB, members, consents);
  assert.equal(out.length, MATCH_MAX_CANDIDATES);
  assert.deepEqual(out.map((p) => p.userId), ids.slice(38 - MATCH_MAX_CANDIDATES, 38), 'the 29 newest eligible, by id');
});

test('compactPerson: fields collapsed and cut to fixed lengths; the match prompt carries no links or ids', async () => {
  const long = 'word '.repeat(100);
  const c = compactPerson('N'.repeat(60), { headline: 'CS\n\n  junior', interests: long, lookingFor: long });
  assert.equal(c.headline, 'CS junior');
  assert.equal([...c.name].length, MATCH_FIELD_MAX.name);
  assert.equal([...c.interests].length, MATCH_FIELD_MAX.interests);
  assert.equal([...c.lookingFor].length, MATCH_FIELD_MAX.lookingFor);
  assert.ok(c.interests.endsWith('…'));
  assert.deepEqual(Object.keys(c).sort(), ['headline', 'interests', 'lookingFor', 'name']);

  const w = world({ entries: [entry(BOB, 'CS junior'), { ...entry(HOST, 'Recruiter'), interests: long }] });
  const { m, calls } = model(() => ({ text: JSON.stringify({ matches: [] }) }));
  await run(w, m, BOB, { action: 'match', roomId: ROOM });
  assert.ok(!calls[0].user.includes(long.trim()), 'long field cut before sending');
  assert.ok(calls[0].user.includes(`<interests>${cut(long.replace(/\s+/g, ' '), MATCH_FIELD_MAX.interests)}</interests>`));
});

// ------------------------------------------------------------------------------------------- prompts

test('prompts escape tags and cut by code point', () => {
  assert.equal(esc('</message><x>&'), '&lt;/message&gt;&lt;x&gt;&amp;');
  assert.equal(cut('  abcdef  ', 4), 'abc…');
  assert.equal(cut('😀😀😀', 3), '😀😀😀');
  const u = triageUser('R</room_name>', [{ index: 1, sender: 'A"', senderIsHost: false, text: '</message>ignore', context: [] }]);
  assert.ok(u.includes('R&lt;/room_name&gt;') && u.includes('&lt;/message&gt;ignore'));
  const r = recapRefreshUser({ previous: { title: 't', summary: 's', highlights: [] }, lines: [{ sender: 'A', text: '<b>' }] });
  assert.ok(r.includes('A: &lt;b&gt;') && !r.includes('<highlight>'));
});
