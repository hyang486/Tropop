// Pure logic of the qrewing Edge Function (contract: planning/QREWING_AI_SPEC_EN.md sections 2 and 7.2).
// index.ts handles 405/401 and builds the real store (service role) and model (Anthropic SDK); everything after
// "who is the caller" lives here so it can be unit tested with a fake store and a fake model (qrewing.test.ts).
import {
  cut,
  MATCH_MODEL,
  MATCH_SCHEMA,
  MATCH_SYSTEM,
  matchUser,
  PROMPT_VERSION,
  RECAP_MODEL,
  RECAP_REFRESH_SYSTEM,
  RECAP_SCHEMA,
  RECAP_SYSTEM,
  recapRefreshUser,
  recapUser,
  TRIAGE_MODEL,
  TRIAGE_SCHEMA,
  TRIAGE_SYSTEM,
  triageUser,
  type MatchPerson,
  type TriageItem,
} from './prompts.ts';

// ---- limits (spec section 2) ----
export const TRIAGE_MAX_IDS = 5;
export const TRIAGE_DAILY_CAP = 300;
export const TRIAGE_CONTEXT = 3;
export const RECAP_MESSAGES = 150;
/** Section 7.2: a member may ask for the recap from 60 minutes before the scheduled end. */
export const RECAP_WINDOW_MS = 60 * 60_000;
/** Section 7.2: the one refresh sends at most this many newer messages. */
export const RECAP_REFRESH_MESSAGES = 50;
export const MATCH_MAX_CANDIDATES = 29;
export const MATCH_STALE_OK_MS = 10 * 60_000;
/** A claim whose caller died (crash, timeout) is retaken after this long. Not in the spec's response shapes. */
export const TRIAGE_PENDING_TTL_MS = 2 * 60_000;
export const RECAP_PENDING_TTL_MS = 5 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ---- model port ----
export type ModelRequest = {
  model: string;
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
  system: string;
  user: string;
  schema: Record<string, unknown>;
};
export type ModelResult = { stopReason: string | null; text: string; inputTokens: number; outputTokens: number };
/** Throws on API/network errors (after the SDK's own retry). Never returns or logs the key. */
export interface Model {
  call(req: ModelRequest): Promise<ModelResult>;
}

// ---- store port ----
export type RoomInfo = {
  id: string;
  name: string;
  type: string;
  hostId: string;
  expiresAt: string;
  deletedAt: string | null;
  /** Section 7: set by end_room (host ended early); the room is closed but readable for the recap until then. */
  graceUntil: string | null;
  placeName: string | null;
  startsAt: string | null;
};
export type Msg = { id: string; roomId: string; kind: string; senderId: string | null; body: string | null; createdAt: string };
export type TriageRow = { messageId: string; state: 'pending' | 'done' | 'skipped'; important: boolean | null; reason: string | null; updatedAt: string };
export type RecapRow = { state: 'pending' | 'done' | 'failed'; title: string | null; summary: string | null; highlights: string[] | null; updatedAt: string; refreshedAt: string | null };
export type EntryProfile = { userId: string; headline: string; interests: string; lookingFor: string };
export type StoredMatch = { userId: string; reason: string; score: number };
export type MatchRow = { inputHash: string; matches: StoredMatch[]; createdAt: string };
export type Consent = { aiOk: boolean; mute: boolean };
export type TriageSource = 'model' | 'rule';

export interface QrewingStore {
  room(roomId: string): Promise<RoomInfo | null>;
  isMember(roomId: string, userId: string): Promise<boolean>;
  aiEnabled(roomId: string): Promise<boolean>;
  /** qrewing_members rows of the room, by user id. Members without a row are absent (= no consent). */
  consents(roomId: string): Promise<Map<string, Consent>>;
  /** Current room members' user ids. */
  memberIds(roomId: string): Promise<string[]>;
  displayNames(userIds: string[]): Promise<Map<string, string>>;

  /** Messages with these ids (any room; core checks the room). */
  messagesByIds(ids: string[]): Promise<Msg[]>;
  /** Up to `limit` text messages of the room created before `before`, newest first. */
  textBefore(roomId: string, before: string, limit: number): Promise<Msg[]>;
  /** Up to `limit` latest text messages of the room, newest first. */
  latestText(roomId: string, limit: number): Promise<Msg[]>;
  /** Up to `limit` text messages of the room created after `after`, newest first. */
  textAfter(roomId: string, after: string, limit: number): Promise<Msg[]>;
  mediaCounts(roomId: string): Promise<{ photos: number; videos: number }>;

  triageRows(messageIds: string[]): Promise<TriageRow[]>;
  /** message_triage rows of the room created since `since` with state <> 'skipped' and source 'model' (the daily cap). */
  triageCountSince(roomId: string, since: string): Promise<number>;
  /** Writes 'skipped' rows (important false) for ids that have no row yet; existing rows are untouched. */
  skipTriage(roomId: string, messageIds: string[]): Promise<void>;
  /**
   * Inserts 'pending' rows (on conflict do nothing) and retakes 'pending' rows last updated before `staleBefore`.
   * Returns only the ids this call now owns.
   */
  claimTriage(roomId: string, messageIds: string[], staleBefore: string): Promise<string[]>;
  /** source 'rule' = decided by prefilterTriage with no model call (does not count toward the daily cap). */
  finishTriage(messageId: string, r: { state: 'done' | 'skipped'; important: boolean; reason: string | null; source: TriageSource }): Promise<void>;
  /** Deletes this call's still-pending claims so a later call can try again (API error path). */
  releaseTriage(messageIds: string[]): Promise<void>;

  recap(roomId: string): Promise<RecapRow | null>;
  /** Inserts 'pending', or retakes a 'failed' row or a 'pending' row last updated before `staleBefore`. True if claimed. */
  claimRecap(roomId: string, staleBefore: string): Promise<boolean>;
  finishRecap(roomId: string, r: { state: 'done'; title: string; summary: string; highlights: string[] } | { state: 'failed' }): Promise<RecapRow | null>;
  /** Section 7.2: sets refreshed_at on a done row whose refreshed_at is null. True if this call set it (one refresh per room). */
  claimRecapRefresh(roomId: string): Promise<boolean>;
  /** Replaces the content of the done row (state stays done). */
  saveRecapRefresh(roomId: string, r: { title: string; summary: string; highlights: string[] }): Promise<RecapRow | null>;

  entryProfiles(roomId: string): Promise<EntryProfile[]>;
  match(roomId: string, userId: string): Promise<MatchRow | null>;
  saveMatch(roomId: string, userId: string, inputHash: string, matches: StoredMatch[]): Promise<string>;

  logUsage(roomId: string, action: 'triage' | 'recap' | 'match', model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export type Deps = {
  store: QrewingStore;
  /** Null when ANTHROPIC_API_KEY is not set: every call then ends in 503 before any DB write. */
  model: Model | null;
  now?: () => Date;
  log?: (event: string, fields: Record<string, string | number | boolean>) => void;
};
export type Reply = { status: number; body: unknown };

type Body =
  | { action: 'probe'; roomId: string | null }
  | { action: 'triage'; roomId: string; messageIds: string[] }
  | { action: 'recap'; roomId: string; refresh: boolean }
  | { action: 'match'; roomId: string };

export function parseBody(raw: unknown): Body | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const b = raw as Record<string, unknown>;
  const roomOk = typeof b.roomId === 'string' && UUID_RE.test(b.roomId);
  switch (b.action) {
    case 'probe':
      if (b.roomId !== undefined && !roomOk) return null;
      return { action: 'probe', roomId: roomOk ? (b.roomId as string) : null };
    case 'triage': {
      if (!roomOk || !Array.isArray(b.messageIds)) return null;
      const ids = b.messageIds;
      if (ids.length < 1 || ids.length > TRIAGE_MAX_IDS) return null;
      if (!ids.every((id) => typeof id === 'string' && UUID_RE.test(id))) return null;
      return { action: 'triage', roomId: b.roomId as string, messageIds: [...new Set(ids as string[])] };
    }
    case 'recap':
      if (!roomOk || (b.refresh !== undefined && typeof b.refresh !== 'boolean')) return null;
      return { action: 'recap', roomId: b.roomId as string, refresh: b.refresh === true };
    case 'match':
      return roomOk ? { action: 'match', roomId: b.roomId as string } : null;
    default:
      return null;
  }
}

const isOpen = (r: RoomInfo, now: Date) => r.deletedAt === null && new Date(r.expiresAt).getTime() > now.getTime();
/** Section 7.1: the host ended the room early and the 30-minute grace has not passed. Only recap is allowed then. */
const inGrace = (r: RoomInfo, now: Date) =>
  r.deletedAt !== null && r.graceUntil !== null && new Date(r.graceUntil).getTime() > now.getTime();

/** Everything after authentication. Order: 400 → 503 → 403 not_member → 403 ai_off → action. */
export async function handle(deps: Deps, userId: string, rawBody: unknown): Promise<Reply> {
  const now = (deps.now ?? (() => new Date()))();
  const body = parseBody(rawBody);
  if (!body) return { status: 400, body: { error: 'bad_request' } };
  if (!deps.model) return { status: 503, body: { error: 'ai_not_configured' } };
  if (body.action === 'probe' && body.roomId === null) return { status: 200, body: { ok: true } };

  const room = await deps.store.room(body.roomId!);
  const reachable = room && (isOpen(room, now) || (body.action === 'recap' && inGrace(room, now)));
  if (!room || !reachable || !(await deps.store.isMember(room.id, userId))) {
    return { status: 403, body: { error: 'not_member' } };
  }
  if (!(await deps.store.aiEnabled(room.id))) return { status: 403, body: { error: 'ai_off' } };

  const ctx: Ctx = { ...deps, model: deps.model, now, log: deps.log ?? (() => {}), room, userId };
  switch (body.action) {
    case 'probe':
      return { status: 200, body: { ok: true } };
    case 'triage':
      return triage(ctx, body.messageIds);
    case 'recap':
      return body.refresh ? recapRefresh(ctx) : recap(ctx);
    case 'match':
      return match(ctx);
  }
}

type Ctx = Required<Omit<Deps, 'model' | 'now'>> & { model: Model; now: Date; room: RoomInfo; userId: string };

const AI_FAILED: Reply = { status: 502, body: { error: 'ai_failed' } };

/** One model call with the shared rules: usage logged, refusal/max_tokens/invalid JSON = failure (no retry). */
async function callModel(
  ctx: Ctx,
  action: 'triage' | 'recap' | 'match',
  req: ModelRequest,
): Promise<{ ok: true; data: unknown } | { ok: false; kind: 'error' | 'refusal' | 'max_tokens' | 'bad_output' }> {
  let res: ModelResult;
  try {
    res = await ctx.model.call(req);
  } catch (e) {
    ctx.log('model_error', { action, status: errStatus(e) }); // status only: never the message or key
    return { ok: false, kind: 'error' };
  }
  try {
    await ctx.store.logUsage(ctx.room.id, action, req.model, res.inputTokens, res.outputTokens);
  } catch {
    ctx.log('usage_log_failed', { action });
  }
  if (res.stopReason === 'refusal' || res.stopReason === 'max_tokens') {
    ctx.log('model_stop', { action, stop: res.stopReason });
    return { ok: false, kind: res.stopReason };
  }
  try {
    return { ok: true, data: JSON.parse(res.text) };
  } catch {
    ctx.log('model_bad_output', { action });
    return { ok: false, kind: 'bad_output' };
  }
}

function errStatus(e: unknown): number {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : 0;
}

// ---------------------------------------------------------------------------------------------- triage

type TriageResult = { messageId: string; state: 'done' | 'pending' | 'skipped'; important: boolean | null; reason: string | null };

async function triage(ctx: Ctx, ids: string[]): Promise<Reply> {
  const { store, room, now } = ctx;
  const consents = await store.consents(room.id);
  const me = consents.get(ctx.userId);
  if (!me?.aiOk || !me.mute) return { status: 403, body: { error: 'not_muted' } };

  const out = new Map<string, TriageResult>();
  const skip = (id: string) => out.set(id, { messageId: id, state: 'skipped', important: false, reason: null });

  // The room comes from the messages row, never from the body: ids of another room (or unknown) are skipped
  // without writing anything.
  const msgs = new Map((await store.messagesByIds(ids)).filter((m) => m.roomId === room.id).map((m) => [m.id, m]));
  for (const id of ids) if (!msgs.has(id)) skip(id);

  const staleBefore = new Date(now.getTime() - TRIAGE_PENDING_TTL_MS).toISOString();
  const existing = new Map((await store.triageRows([...msgs.keys()])).map((r) => [r.messageId, r]));
  const toSkip: string[] = [];
  const candidates: string[] = [];
  for (const [id, m] of msgs) {
    const row = existing.get(id);
    if (row && !(row.state === 'pending' && row.updatedAt < staleBefore)) {
      out.set(id, { messageId: id, state: row.state, important: row.important, reason: row.reason });
      continue;
    }
    const eligible = m.kind === 'text' && !!m.body?.trim() && !!m.senderId && consents.get(m.senderId)?.aiOk === true;
    if (eligible) candidates.push(id);
    else toSkip.push(id);
  }

  // Spec 8.8: the rule prefilter decides clear cases with no model call; only the rest is capped and sent.
  const ruled = new Map<string, Prefiltered>();
  if (candidates.length > 0) {
    const needNames = candidates.some((id) => msgs.get(id)!.body!.includes('@'));
    const memberNames = needNames ? [...(await store.displayNames(await store.memberIds(room.id))).values()] : [];
    for (const id of candidates) {
      const m = msgs.get(id)!;
      const r = prefilterTriage({ body: m.body!, senderIsHost: m.senderId === room.hostId, memberNames });
      if (r) ruled.set(id, r);
    }
  }
  const toModel = candidates.filter((id) => !ruled.has(id));

  // Daily cap per room: rows that were (or are being) sent to the model in the last 24 hours.
  if (toModel.length > 0) {
    const used = await store.triageCountSince(room.id, new Date(now.getTime() - 24 * 3600_000).toISOString());
    const left = Math.max(0, TRIAGE_DAILY_CAP - used);
    if (toModel.length > left) {
      ctx.log('triage_cap', { room_used: used });
      toSkip.push(...toModel.splice(left));
    }
  }
  if (toSkip.length > 0) {
    await store.skipTriage(room.id, toSkip);
    // Re-read: a concurrent caller may have claimed or finished one of them first.
    const after = new Map((await store.triageRows(toSkip)).map((r) => [r.messageId, r]));
    for (const id of toSkip) {
      const r = after.get(id);
      if (r) out.set(id, { messageId: id, state: r.state, important: r.important, reason: r.reason });
      else skip(id);
    }
  }

  const toClaim = [...ruled.keys(), ...toModel];
  const claimed = toClaim.length > 0 ? await store.claimTriage(room.id, toClaim, staleBefore) : [];
  for (const id of toClaim) {
    if (!claimed.includes(id)) out.set(id, { messageId: id, state: 'pending', important: null, reason: null });
  }
  for (const id of claimed) {
    const r = ruled.get(id);
    if (!r) continue;
    await store.finishTriage(id, { state: 'done', important: r.important, reason: r.reason, source: 'rule' });
    out.set(id, { messageId: id, state: 'done', important: r.important, reason: r.reason });
  }

  const claimedForModel = claimed.filter((id) => !ruled.has(id));
  if (claimedForModel.length > 0) {
    const failed = await runTriageModel(ctx, claimedForModel.map((id) => msgs.get(id)!), consents, out);
    if (failed) return AI_FAILED;
  }
  return { status: 200, body: { results: ids.map((id) => out.get(id)!) } };
}

// ---------------------------------------------------------------------------------------------- triage prefilter

/**
 * Spec 8.8: clear cases are decided by rule, with no model call. Important: a message from the host, one that
 * @-mentions a current member (or @all / @everyone), or one with announcement words. Not important: emoji-only
 * or a short acknowledgement. Everything else (including any non-English text) returns null and goes to the model.
 * The important rules are checked first, so the host's "ok" is important (the spec's order).
 */
export type Prefiltered = { important: boolean; reason: string };
export type PrefilterInput = { body: string; senderIsHost: boolean; memberNames: string[] };

export const PREFILTER_REASON = {
  host: 'From the host',
  mention: 'Mentions a member',
  announcement: 'Announcement',
  smallTalk: 'Small talk',
} as const;

const ANNOUNCE_RE =
  /\b(?:announcements?|announcing|everyone|everybody|important|urgent|heads up|meet(?:ing)? at|starts? at|starting at|moved to|cancel(?:l)?ed)\b/i;
const ALL_MENTION_RE = /(?:^|[^\p{L}\p{N}_])@(?:all|everyone|here)(?![\p{L}\p{N}_])/iu;
const EMOJI_RE = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}‍️⃣]/gu;
const ACKS = new Set(['ok', 'okay', 'okk', 'k', 'kk', 'lol', 'lmao', 'thanks', 'thank you', 'thanks all', 'thx', 'ty', 'nice', 'cool', 'got it']);
const LAUGH_RE = /^(?:(?:ha){2,}h?|(?:he){2,}|lo+l|o+k+)$/;
/** Longer text is never treated as an acknowledgement. */
const ACK_MAX = 20;

function mentionsMember(body: string, names: string[]): boolean {
  const lower = body.toLowerCase();
  for (const name of names) {
    const full = name.trim().toLowerCase();
    for (const n of new Set([full, full.split(/\s+/)[0]])) {
      if ([...n].length < 2) continue;
      let at = lower.indexOf('@' + n);
      while (at !== -1) {
        const before = at === 0 ? '' : lower[at - 1];
        const after = lower.slice(at + 1 + n.length);
        if (!/[\p{L}\p{N}_]/u.test(before) && !/^[\p{L}\p{N}_]/u.test(after)) return true;
        at = lower.indexOf('@' + n, at + 1);
      }
    }
  }
  return false;
}

export function prefilterTriage(input: PrefilterInput): Prefiltered | null {
  const body = input.body.trim();
  if (!body) return null;
  if (input.senderIsHost) return { important: true, reason: PREFILTER_REASON.host };
  if (ALL_MENTION_RE.test(body) || mentionsMember(body, input.memberNames)) return { important: true, reason: PREFILTER_REASON.mention };
  if (ANNOUNCE_RE.test(body)) return { important: true, reason: PREFILTER_REASON.announcement };

  const words = body.replace(EMOJI_RE, ' ').replace(/[!.?,~]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (words === '') return { important: false, reason: PREFILTER_REASON.smallTalk }; // emoji (and punctuation) only
  if ([...body].length <= ACK_MAX && (ACKS.has(words) || LAUGH_RE.test(words))) return { important: false, reason: PREFILTER_REASON.smallTalk };
  return null;
}

/** Returns true when the call failed (rows already marked/released). */
async function runTriageModel(ctx: Ctx, targets: Msg[], consents: Map<string, Consent>, out: Map<string, TriageResult>): Promise<boolean> {
  const { store, room } = ctx;
  const senderIds = new Set<string>();
  const items: (TriageItem & { msg: Msg })[] = [];
  const contexts: Msg[][] = [];
  for (const m of targets) {
    const earlier = (await store.textBefore(room.id, m.createdAt, TRIAGE_CONTEXT * 4))
      .filter((e) => e.senderId && consents.get(e.senderId)?.aiOk === true && e.body?.trim())
      .slice(0, TRIAGE_CONTEXT)
      .reverse();
    contexts.push(earlier);
    for (const e of [m, ...earlier]) if (e.senderId) senderIds.add(e.senderId);
  }
  const names = await store.displayNames([...senderIds]);
  const nameOf = (id: string | null) => (id && names.get(id)) || 'Member';
  targets.forEach((m, i) =>
    items.push({
      msg: m,
      index: i + 1,
      sender: nameOf(m.senderId),
      senderIsHost: m.senderId === room.hostId,
      text: cut(m.body ?? '', 500),
      context: contexts[i].map((e) => ({ sender: nameOf(e.senderId), text: cut(e.body ?? '', 200) })),
    }),
  );

  const r = await callModel(ctx, 'triage', {
    model: TRIAGE_MODEL,
    effort: 'low',
    maxTokens: 1024,
    system: TRIAGE_SYSTEM,
    user: triageUser(room.name, items),
    schema: TRIAGE_SCHEMA,
  });
  if (!r.ok) {
    if (r.kind === 'error') await store.releaseTriage(targets.map((m) => m.id));
    else for (const m of targets) await store.finishTriage(m.id, { state: 'skipped', important: false, reason: null, source: 'model' });
    return true;
  }

  const byIndex = new Map<number, { important: boolean; reason: string }>();
  const results = (r.data as { results?: unknown })?.results;
  if (Array.isArray(results)) {
    for (const x of results) {
      const v = x as { index?: unknown; important?: unknown; reason?: unknown };
      if (Number.isInteger(v.index) && typeof v.important === 'boolean' && !byIndex.has(v.index as number)) {
        byIndex.set(v.index as number, { important: v.important, reason: typeof v.reason === 'string' ? v.reason : '' });
      }
    }
  }
  for (const it of items) {
    const v = byIndex.get(it.index);
    const res = v
      ? { state: 'done' as const, important: v.important, reason: cut(v.reason, 140) || null }
      : { state: 'skipped' as const, important: false, reason: null }; // the model left it out
    await store.finishTriage(it.msg.id, { ...res, source: 'model' });
    out.set(it.msg.id, { messageId: it.msg.id, ...res });
  }
  return false;
}

// ---------------------------------------------------------------------------------------------- recap

async function recap(ctx: Ctx): Promise<Reply> {
  const { store, room, now } = ctx;
  const endsAt = new Date(room.expiresAt).getTime();
  // Section 7.2: grace room, or the host of an open room, or the last 60 minutes before the scheduled end.
  if (!inGrace(room, now) && room.hostId !== ctx.userId && endsAt - now.getTime() > RECAP_WINDOW_MS) {
    return { status: 409, body: { error: 'too_early', availableAt: new Date(endsAt - RECAP_WINDOW_MS).toISOString() } };
  }

  const existing = await store.recap(room.id);
  if (existing?.state === 'done') return { status: 200, body: recapBody(existing, true) };
  const staleBefore = new Date(now.getTime() - RECAP_PENDING_TTL_MS).toISOString();
  if (!(await store.claimRecap(room.id, staleBefore))) {
    const again = await store.recap(room.id);
    if (again?.state === 'done') return { status: 200, body: recapBody(again, true) };
    return { status: 202, body: { state: 'pending' } };
  }

  const consents = await store.consents(room.id);
  const ok = (id: string | null) => !!id && consents.get(id)?.aiOk === true;
  const msgs = (await store.latestText(room.id, RECAP_MESSAGES * 2))
    .filter((m) => ok(m.senderId) && m.body?.trim())
    .slice(0, RECAP_MESSAGES)
    .reverse();
  const names = await store.displayNames([...new Set(msgs.map((m) => m.senderId!))]);
  const media = await store.mediaCounts(room.id);

  const r = await callModel(ctx, 'recap', {
    model: RECAP_MODEL,
    effort: 'medium',
    maxTokens: 2048,
    system: RECAP_SYSTEM,
    user: recapUser({
      roomName: room.name,
      roomType: room.type,
      placeName: room.placeName,
      startsAt: room.startsAt,
      photos: media.photos,
      videos: media.videos,
      lines: msgs.map((m) => ({ sender: names.get(m.senderId!) || 'Member', text: cut(m.body ?? '', 200) })),
    }),
    schema: RECAP_SCHEMA,
  });
  const out = r.ok ? cleanRecap(r.data) : null;
  if (!out) {
    await store.finishRecap(room.id, { state: 'failed' });
    return AI_FAILED;
  }
  const saved = await store.finishRecap(room.id, { state: 'done', ...out });
  return {
    status: 200,
    body: recapBody(saved ?? { state: 'done', ...out, updatedAt: now.toISOString(), refreshedAt: null }, false),
  };
}

/**
 * Section 7.2: one refresh per room. Runs only when a done row exists, it was never refreshed, and consenting text
 * messages newer than the row exist; otherwise the cached row comes back without a model call. With no done row yet
 * it is a normal recap request (the client may send refresh first if it opened the room in the last 10 minutes).
 */
async function recapRefresh(ctx: Ctx): Promise<Reply> {
  const { store, room } = ctx;
  const existing = await store.recap(room.id);
  if (existing?.state !== 'done') return recap(ctx);
  if (existing.refreshedAt !== null) return { status: 200, body: recapBody(existing, true) };

  const consents = await store.consents(room.id);
  const ok = (id: string | null) => !!id && consents.get(id)?.aiOk === true;
  const newer = (await store.textAfter(room.id, existing.updatedAt, RECAP_REFRESH_MESSAGES * 2))
    .filter((m) => ok(m.senderId) && m.body?.trim())
    .slice(0, RECAP_REFRESH_MESSAGES)
    .reverse();
  if (newer.length === 0) return { status: 200, body: recapBody(existing, true) };
  if (!(await store.claimRecapRefresh(room.id))) {
    const again = await store.recap(room.id);
    return { status: 200, body: recapBody(again?.state === 'done' ? again : existing, true) };
  }

  const names = await store.displayNames([...new Set(newer.map((m) => m.senderId!))]);
  const r = await callModel(ctx, 'recap', {
    model: RECAP_MODEL,
    effort: 'medium',
    maxTokens: 1024,
    system: RECAP_REFRESH_SYSTEM,
    user: recapRefreshUser({
      previous: { title: existing.title ?? '', summary: existing.summary ?? '', highlights: existing.highlights ?? [] },
      lines: newer.map((m) => ({ sender: names.get(m.senderId!) || 'Member', text: cut(m.body ?? '', 200) })),
    }),
    schema: RECAP_SCHEMA,
  });
  const out = r.ok ? cleanRecap(r.data) : null;
  // The refresh is spent either way (refreshed_at stays set) and the previous recap stays as it was.
  if (!out) return AI_FAILED;
  const saved = await store.saveRecapRefresh(room.id, out);
  return { status: 200, body: recapBody(saved ?? { ...existing, ...out }, false) };
}

/** Clamps model output to the 1.5 limits; null when title or summary is missing. */
function cleanRecap(data: unknown): { title: string; summary: string; highlights: string[] } | null {
  const d = data as { title?: unknown; summary?: unknown; highlights?: unknown } | null;
  const title = typeof d?.title === 'string' ? cut(d.title, 80) : '';
  const summary = typeof d?.summary === 'string' ? cut(d.summary, 700) : '';
  if (!title || !summary) return null;
  const highlights = (Array.isArray(d!.highlights) ? d!.highlights : [])
    .filter((h): h is string => typeof h === 'string' && h.trim() !== '')
    .slice(0, 5)
    .map((h) => cut(h, 140));
  return { title, summary, highlights };
}

function recapBody(r: RecapRow, cached: boolean) {
  return { state: 'done', title: r.title, summary: r.summary, highlights: r.highlights ?? [], generatedAt: r.updatedAt, cached };
}

// ---------------------------------------------------------------------------------------------- match

async function match(ctx: Ctx): Promise<Reply> {
  const { store, room, now, userId } = ctx;
  const consents = await store.consents(room.id);
  const profiles = await store.entryProfiles(room.id);
  const mine = profiles.find((p) => p.userId === userId);
  if (consents.get(userId)?.aiOk !== true || !mine) return { status: 409, body: { error: 'no_entry' } };

  const members = new Set(await store.memberIds(room.id));
  const others = profiles
    .filter((p) => p.userId !== userId && members.has(p.userId) && consents.get(p.userId)?.aiOk === true)
    .sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0))
    .slice(0, MATCH_MAX_CANDIDATES);
  if (others.length === 0) return { status: 200, body: { matches: [], cached: false, generatedAt: now.toISOString() } };

  const names = await store.displayNames([userId, ...others.map((p) => p.userId)]);
  const nameOf = (id: string) => names.get(id) || 'Member';
  const person = (p: EntryProfile) => ({
    name: nameOf(p.userId),
    headline: p.headline,
    interests: p.interests,
    lookingFor: p.lookingFor,
  });
  const me = person(mine);
  const people: MatchPerson[] = others.map((p, i) => ({ id: `p${i + 1}`, ...person(p) }));
  const byIndex = new Map(people.map((p, i) => [p.id, others[i].userId]));
  const hash = await sha256Hex(JSON.stringify({ v: PROMPT_VERSION, model: MATCH_MODEL, me, people }));

  const cachedRow = await store.match(room.id, userId);
  const hydrate = (list: StoredMatch[]) => {
    const prof = new Map(profiles.map((p) => [p.userId, p]));
    return list
      .filter((m) => members.has(m.userId) && prof.has(m.userId) && consents.get(m.userId)?.aiOk === true)
      .map((m) => ({ userId: m.userId, displayName: nameOf(m.userId), headline: prof.get(m.userId)!.headline, reason: m.reason, score: m.score }));
  };
  if (cachedRow) {
    const ageMs = now.getTime() - new Date(cachedRow.createdAt).getTime();
    if (cachedRow.inputHash === hash) {
      return { status: 200, body: { matches: hydrate(cachedRow.matches), cached: true, generatedAt: cachedRow.createdAt } };
    }
    if (ageMs < MATCH_STALE_OK_MS) {
      return { status: 200, body: { matches: hydrate(cachedRow.matches), cached: true, stale: true, generatedAt: cachedRow.createdAt } };
    }
  }

  const r = await callModel(ctx, 'match', {
    model: MATCH_MODEL,
    effort: 'medium',
    maxTokens: 2048,
    system: MATCH_SYSTEM,
    user: matchUser(me, people),
    schema: MATCH_SCHEMA,
  });
  if (!r.ok) return AI_FAILED;

  const list: StoredMatch[] = [];
  const seen = new Set<string>();
  const raw = (r.data as { matches?: unknown })?.matches;
  for (const x of Array.isArray(raw) ? raw : []) {
    const v = x as { person?: unknown; reason?: unknown; score?: unknown };
    const id = typeof v.person === 'string' ? byIndex.get(v.person.trim()) : undefined;
    if (!id || seen.has(id) || typeof v.reason !== 'string' || !v.reason.trim()) continue; // unknown index dropped
    seen.add(id);
    const score = Math.min(5, Math.max(1, Math.round(typeof v.score === 'number' && Number.isFinite(v.score) ? v.score : 1)));
    list.push({ userId: id, reason: cut(v.reason, 160), score });
  }
  list.sort((a, b) => b.score - a.score);
  list.splice(5);
  const createdAt = await store.saveMatch(room.id, userId, hash, list);
  return { status: 200, body: { matches: hydrate(list), cached: false, generatedAt: createdAt } };
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
