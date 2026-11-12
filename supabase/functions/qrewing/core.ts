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
/** Spec 8.9: each text field sent to the match model is collapsed and cut to this many characters. */
export const MATCH_FIELD_MAX = { name: 40, headline: 80, interests: 160, lookingFor: 160 } as const;
/** A claim whose caller died (crash, timeout) is retaken after this long. Not in the spec's response shapes. */
// L7: longer than one model call can take (SDK timeout 60 s, one retry, plus backoff), so a live call is not retaken.
export const TRIAGE_PENDING_TTL_MS = 3 * 60_000;
export const RECAP_PENDING_TTL_MS = 5 * 60_000;
/** F3: a match claim older than this is treated as abandoned (its caller died) and may be retaken. */
export const MATCH_PENDING_TTL_MS = 3 * 60_000;
/** input_hash prefix of a qrewing_matches row that a caller is computing (no new column; 0027 is frozen). */
export const MATCH_PENDING_PREFIX = 'pending:';
/**
 * M1: input_hash of a row whose last model call failed (the call may have been billed) is `failed:<n>`, n = failures
 * in a row. Until the cooldown for n has passed since the failure, the caller gets the previous list as stale, or 502,
 * with no new model call. A success writes the real hash, which resets n. Bound: about 3 failed calls a day per user.
 */
export const MATCH_FAILED_PREFIX = 'failed:';
export function matchFailCooldownMs(n: number): number {
  return n <= 1 ? 2 * 60_000 : n === 2 ? 10 * 60_000 : 24 * 3600_000;
}
/** n of a `failed:<n>` marker, or 0 for any other input_hash. */
export function matchFailures(inputHash: string): number {
  if (!inputHash.startsWith(MATCH_FAILED_PREFIX)) return 0;
  const n = Number(inputHash.slice(MATCH_FAILED_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : 1;
}
/**
 * M2: reason stored on a 'skipped' row the model was asked about but did not answer (API error or timeout, refusal,
 * max_tokens, bad output, or an index it left out). Such a row is final (never retried) and counts toward the daily
 * cap; rows skipped with no model call keep reason null and do not count. Clients get reason null for skipped rows.
 */
export const TRIAGE_MODEL_SKIP_REASON = 'model_failed';

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
/**
 * createdAt = when the attempt that produced this row was claimed (reset on every retake), so messages sent while it
 * was generating count as newer for the refresh. refreshedAt: on a done row, the one refresh is spent; on a failed
 * row, the one retry is spent (F1: no new column, 0027 is frozen as reviewed). A done row starts with it null.
 */
export type RecapRow = {
  state: 'pending' | 'done' | 'failed';
  title: string | null;
  summary: string | null;
  highlights: string[] | null;
  createdAt: string;
  updatedAt: string;
  refreshedAt: string | null;
};
export type EntryProfile = { userId: string; headline: string; interests: string; lookingFor: string; updatedAt: string };
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
  /**
   * The daily cap: message_triage rows of the room created since `since` with source 'model' and either
   * state <> 'skipped' or a non-null reason (M2: a skipped row the model was asked about).
   */
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

  recap(roomId: string): Promise<RecapRow | null>;
  /**
   * Inserts 'pending', or retakes a 'pending' row last updated before `staleBefore` or a 'failed' row, either one only
   * while its retry is not spent (refreshed_at null), setting refreshed_at. Every retake resets created_at. True if claimed.
   */
  claimRecap(roomId: string, staleBefore: string): Promise<boolean>;
  /** done: content set, refreshed_at cleared (the refresh is still available). failed: refreshed_at kept. */
  finishRecap(roomId: string, r: { state: 'done'; title: string; summary: string; highlights: string[] } | { state: 'failed' }): Promise<RecapRow | null>;
  /** Section 7.2: sets refreshed_at on a done row whose refreshed_at is null. True if this call set it (one refresh per room). */
  claimRecapRefresh(roomId: string): Promise<boolean>;
  /** Replaces the content of the done row (state stays done). */
  saveRecapRefresh(roomId: string, r: { title: string; summary: string; highlights: string[] }): Promise<RecapRow | null>;

  entryProfiles(roomId: string): Promise<EntryProfile[]>;
  match(roomId: string, userId: string): Promise<MatchRow | null>;
  /**
   * F3 in-flight guard. Compare-and-set on input_hash: inserts {input_hash: claim, matches: []} when `seenHash` is
   * null (no row), else sets input_hash = claim and created_at = now where input_hash still equals `seenHash`.
   * The old matches stay in the row. True if this call now owns the row.
   */
  claimMatch(roomId: string, userId: string, seenHash: string | null, claim: string): Promise<boolean>;
  /** Writes the result where input_hash still equals `claim`; returns the created_at it wrote. */
  saveMatch(roomId: string, userId: string, claim: string, inputHash: string, matches: StoredMatch[]): Promise<string>;
  /** M1, model failure: sets input_hash = `marker` and created_at = now where input_hash still equals `claim` (matches kept). */
  failMatch(roomId: string, userId: string, claim: string, marker: string): Promise<void>;

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
      out.set(id, toResult(row));
      continue;
    }
    if (m.kind === 'text' && !!m.body?.trim() && !!m.senderId) candidates.push(id);
    else toSkip.push(id);
  }

  // Spec 8.8 + Q3: the rule prefilter runs for every sender and decides clear cases with no model call. Only the
  // rest from consenting senders is capped and sent; the rest from senders without consent is skipped.
  const ruled = new Map<string, Prefiltered>();
  const toModel: string[] = [];
  for (const id of candidates) {
    const m = msgs.get(id)!;
    const r = prefilterTriage({ body: m.body!, senderIsHost: m.senderId === room.hostId });
    if (r) ruled.set(id, r);
    else if (consents.get(m.senderId!)?.aiOk === true) toModel.push(id);
    else toSkip.push(id);
  }

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
      if (r) out.set(id, toResult(r));
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
    // Rule rows of this call are already saved: return them, with the failed ones as skipped (M2: final, no retry).
    // With no rule row decided here, the failure is a 502 as before.
    if (failed && !claimed.some((id) => ruled.has(id))) return AI_FAILED;
    if (failed) for (const id of claimedForModel) out.set(id, { messageId: id, state: 'skipped', important: false, reason: null });
  }
  return { status: 200, body: { results: ids.map((id) => out.get(id)!) } };
}

/** A stored row as the client sees it: a skipped row never carries a reason (M2 marker stays server side). */
function toResult(r: TriageRow): TriageResult {
  return { messageId: r.messageId, state: r.state, important: r.important, reason: r.state === 'skipped' ? null : r.reason };
}

// ---------------------------------------------------------------------------------------------- triage prefilter

/**
 * Spec 8.8 with the qa rulings of 2026-11-12 (Q1-Q3): clear cases are decided by rule, with no model call.
 * Important: a message from the host, one addressed to the whole room (@all / @everyone / @here), or one with
 * announcement words. Not important: emoji-only or a short acknowledgement. A personal @name mention is NOT a rule
 * (the client shows it to the mentioned member); it goes to the model like any other text. Everything else
 * (including any non-English text) returns null. The important rules are checked first, so the host's "ok" is
 * important (the spec's order). The rules run for every sender; consent gates only the model call (Q3).
 */
export type Prefiltered = { important: boolean; reason: string };
export type PrefilterInput = { body: string; senderIsHost: boolean };

export const PREFILTER_REASON = {
  host: 'From the host',
  mention: 'For everyone',
  announcement: 'Announcement',
  smallTalk: 'Small talk',
} as const;

// Q2: bare "everyone", "everybody" and "important" are not announcement words (they go to the model).
const ANNOUNCE_RE = /\b(?:announcements?|announcing|urgent|heads up|meet(?:ing)? at|starts? at|starting at|moved to|cancel(?:l)?ed)\b/i;
const ALL_MENTION_RE = /(?:^|[^\p{L}\p{N}_])@(?:all|everyone|here)(?![\p{L}\p{N}_])/iu;
const EMOJI_RE = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200d\ufe0f\u20e3]/gu;
const ACKS = new Set(['ok', 'okay', 'okk', 'k', 'kk', 'lol', 'lmao', 'thanks', 'thank you', 'thanks all', 'thx', 'ty', 'nice', 'cool', 'got it']);
const LAUGH_RE = /^(?:(?:ha){2,}h?|(?:he){2,}|lo+l|o+k+)$/;
/** Longer text is never treated as an acknowledgement. */
const ACK_MAX = 20;

export function prefilterTriage(input: PrefilterInput): Prefiltered | null {
  const body = input.body.normalize('NFC').trim();
  if (!body) return null;
  if (input.senderIsHost) return { important: true, reason: PREFILTER_REASON.host };
  if (ALL_MENTION_RE.test(body)) return { important: true, reason: PREFILTER_REASON.mention };
  if (ANNOUNCE_RE.test(body)) return { important: true, reason: PREFILTER_REASON.announcement };

  const words = body.replace(EMOJI_RE, ' ').replace(/[!.?,~]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (words === '') return { important: false, reason: PREFILTER_REASON.smallTalk }; // emoji (and punctuation) only
  if ([...body].length <= ACK_MAX && (ACKS.has(words) || LAUGH_RE.test(words))) return { important: false, reason: PREFILTER_REASON.smallTalk };
  return null;
}

/** Returns true when the call failed (M2: the rows are then final 'skipped' rows that count toward the cap). */
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
  const modelSkip = { state: 'skipped' as const, important: false, reason: TRIAGE_MODEL_SKIP_REASON, source: 'model' as const };
  if (!r.ok) {
    // M2: an API error or timeout may still be billed, so it is final like a refusal (no release, no retry).
    for (const m of targets) await store.finishTriage(m.id, modelSkip);
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
    if (!v) {
      // The model left it out.
      await store.finishTriage(it.msg.id, modelSkip);
      out.set(it.msg.id, { messageId: it.msg.id, state: 'skipped', important: false, reason: null });
      continue;
    }
    const res = { state: 'done' as const, important: v.important, reason: cut(v.reason, 140) || null };
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
  // F1: at most two attempts per room. A failed row whose one retry is spent stays failed: no more model calls.
  if (existing?.state === 'failed' && existing.refreshedAt !== null) return AI_FAILED;
  const staleBefore = new Date(now.getTime() - RECAP_PENDING_TTL_MS).toISOString();
  // S2: a stale pending row (its caller was killed, maybe after the model answered) is retaken once, and that spends
  // the retry. A stale pending row whose retry is spent is final: no more model calls.
  const spentStale = (r: RecapRow | null) => r?.state === 'pending' && r.updatedAt < staleBefore && r.refreshedAt !== null;
  if (spentStale(existing)) return AI_FAILED;
  if (!(await store.claimRecap(room.id, staleBefore))) {
    const again = await store.recap(room.id);
    if (again?.state === 'done') return { status: 200, body: recapBody(again, true) };
    if (again?.state === 'failed' || spentStale(again)) return AI_FAILED;
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
      lines: msgs.map((m) => recapLine(names.get(m.senderId!), m.body)),
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
    body: recapBody(saved ?? { state: 'done', ...out, createdAt: now.toISOString(), updatedAt: now.toISOString(), refreshedAt: null }, false),
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
  // Newer than the claim of the attempt that produced the recap (not updated_at): messages sent while it was being
  // generated were not in its input.
  const newer = (await store.textAfter(room.id, existing.createdAt, RECAP_REFRESH_MESSAGES * 2))
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
    // F2: same budget as the first recap; max_tokens includes adaptive thinking, and the one refresh is spent anyway.
    maxTokens: 2048,
    system: RECAP_REFRESH_SYSTEM,
    user: recapRefreshUser({
      previous: { title: existing.title ?? '', summary: existing.summary ?? '', highlights: existing.highlights ?? [] },
      lines: newer.map((m) => recapLine(names.get(m.senderId!), m.body)),
    }),
    schema: RECAP_SCHEMA,
  });
  const out = r.ok ? cleanRecap(r.data) : null;
  // The refresh is spent either way (refreshed_at stays set) and the previous recap stays as it was.
  if (!out) return AI_FAILED;
  const saved = await store.saveRecapRefresh(room.id, out);
  return { status: 200, body: recapBody(saved ?? { ...existing, ...out }, false) };
}

/** L5: one chat line per message ("sender: text"), so a newline in a name or body cannot fake another speaker. */
export function recapLine(name: string | undefined, body: string | null) {
  const flat = (s: string) => s.replace(/\s+/g, ' ');
  return { sender: cut(flat(name || 'Member'), 40) || 'Member', text: cut(flat(body ?? ''), 200) };
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
  const others = matchCandidates(profiles, userId, members, consents);
  if (others.length === 0) return { status: 200, body: { matches: [], cached: false, generatedAt: now.toISOString() } };

  const names = await store.displayNames([userId, ...others.map((p) => p.userId)]);
  const nameOf = (id: string) => names.get(id) || 'Member';
  const person = (p: EntryProfile) => compactPerson(nameOf(p.userId), p);
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
  const fromCache = (row: MatchRow): Reply | null => {
    const ageMs = now.getTime() - new Date(row.createdAt).getTime();
    const stale = { status: 200, body: { matches: hydrate(row.matches), cached: true, stale: true, generatedAt: row.createdAt } };
    if (row.inputHash.startsWith(MATCH_PENDING_PREFIX)) {
      // F3: another call is computing. Show the previous list if there is one, else pending (like recap's 202).
      if (ageMs >= MATCH_PENDING_TTL_MS) return null; // abandoned claim: retake it
      return row.matches.length > 0 ? stale : { status: 202, body: { state: 'pending' } };
    }
    const failures = matchFailures(row.inputHash);
    if (failures > 0) {
      // M1: no new model call until the cooldown for this many failures in a row has passed.
      if (ageMs >= matchFailCooldownMs(failures)) return null;
      return row.matches.length > 0 ? stale : AI_FAILED;
    }
    if (row.inputHash === hash) return { status: 200, body: { matches: hydrate(row.matches), cached: true, generatedAt: row.createdAt } };
    if (ageMs < MATCH_STALE_OK_MS) return stale;
    return null;
  };
  const cachedReply = cachedRow && fromCache(cachedRow);
  if (cachedReply) return cachedReply;

  // F3: one model call per (room, user) at a time. A losing call reads the row again and answers from it.
  const claim = MATCH_PENDING_PREFIX + crypto.randomUUID();
  if (!(await store.claimMatch(room.id, userId, cachedRow?.inputHash ?? null, claim))) {
    const again = await store.match(room.id, userId);
    return (again && fromCache(again)) ?? { status: 202, body: { state: 'pending' } };
  }
  const r = await callModel(ctx, 'match', {
    model: MATCH_MODEL,
    effort: 'medium',
    maxTokens: 2048,
    system: MATCH_SYSTEM,
    user: matchUser(me, people),
    schema: MATCH_SCHEMA,
  });
  if (!r.ok) {
    // M1: the failed call may have been billed; the row starts the cooldown and keeps the previous list.
    // The count carries over from the row this call claimed (a failed marker), so failures in a row escalate.
    const failures = cachedRow ? matchFailures(cachedRow.inputHash) : 0;
    await store.failMatch(room.id, userId, claim, MATCH_FAILED_PREFIX + (failures + 1));
    return AI_FAILED;
  }

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
  const createdAt = await store.saveMatch(room.id, userId, claim, hash, list);
  return { status: 200, body: { matches: hydrate(list), cached: false, generatedAt: createdAt } };
}

/**
 * Spec 2 + 8.9: other current members with consent and an entry; at most MATCH_MAX_CANDIDATES, the most recently
 * updated entries kept; then ordered by user id so the prompt (and its hash) does not depend on the read order.
 */
export function matchCandidates(profiles: EntryProfile[], userId: string, members: Set<string>, consents: Map<string, Consent>): EntryProfile[] {
  const byId = (a: EntryProfile, b: EntryProfile) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
  return profiles
    .filter((p) => p.userId !== userId && members.has(p.userId) && consents.get(p.userId)?.aiOk === true)
    .sort((a, b) => (a.updatedAt === b.updatedAt ? byId(a, b) : a.updatedAt > b.updatedAt ? -1 : 1))
    .slice(0, MATCH_MAX_CANDIDATES)
    .sort(byId);
}

/** Spec 8.9: only the fields matching needs (no links, no ids), whitespace collapsed, each cut to a fixed length. */
export function compactPerson(name: string, p: Pick<EntryProfile, 'headline' | 'interests' | 'lookingFor'>) {
  const f = (s: string, n: number) => cut(s.replace(/\s+/g, ' '), n);
  return {
    name: f(name, MATCH_FIELD_MAX.name),
    headline: f(p.headline, MATCH_FIELD_MAX.headline),
    interests: f(p.interests, MATCH_FIELD_MAX.interests),
    lookingFor: f(p.lookingFor, MATCH_FIELD_MAX.lookingFor),
  };
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
