// Pure rules for the private Trok chat (planning/QREWING_AI_SPEC_EN.md 10.1, 10.3, 10.4): the on-device history,
// the `ask` request body and the errors the ask screen shows. No React Native imports (tested in node).

/** One question and its answer, kept on this device only. `at` is ms since epoch. */
/** `cardId`: the question card Trok created when it passed this question on to a person (UX2-47). */
export type AskTurn = { q: string; a: string; at: number; cardId?: string };

/**
 * The asker's own activity (pace engine paceSnapshot), sent only for the asker. `paceSecPerKm` is null under 100 m
 * or slower than 3600 s/km; it is then left out of the request.
 */
export type AskMe = { elapsedSec: number; distanceM: number; paceSecPerKm: number | null; activity: 'moving' | 'stopped' };

/** The probe for one room: `roomAi` and `plan` come from the server (an older server sends neither and answers only with AI on). */
export type AskProbe = { roomId: string; ok: boolean; roomAi?: boolean; plan?: 'free' | 'plus' };

/**
 * How Ask Trok works in this room, or null for no button (capacity B item 4, qrewing caller-plan contract).
 * room: the room has Trok AI on (client read and probe agree) and the asker is on Plus (or the probe sent no plan):
 * consent first. plus: the same room and the probe says Free; the button opens the Plus intro directly, never consent
 * for something a Free asker cannot use (qa v15). personal: AI is off and the asker is on Plus; the answer uses room
 * details only, so there is no consent step and no relayed question cards. AI off on Free → none.
 */
export function askMode(aiEnabled: boolean, probe: AskProbe | null, roomId: string): 'room' | 'plus' | 'personal' | null {
  if (probe?.roomId !== roomId || !probe.ok) return null;
  if (probe.roomAi ?? true) return !aiEnabled ? null : probe.plan === 'free' ? 'plus' : 'room';
  return probe.plan === 'plus' ? 'personal' : null;
}

export const ASK_LIMITS = { question: 300, keep: 30, send: 4 } as const;

/** AsyncStorage key of a room's history (10.1). */
export const ASK_KEY_PREFIX = 'qrewing.ask.v1.';
export const askKey = (roomId: string) => `${ASK_KEY_PREFIX}${roomId}`;

/** The room id of a history key, or null for any other key. */
export function askKeyRoom(key: string): string | null {
  return key.startsWith(ASK_KEY_PREFIX) && key.length > ASK_KEY_PREFIX.length ? key.slice(ASK_KEY_PREFIX.length) : null;
}

/** History keys to delete: every room that is no longer one of my live rooms (ended, expired or left). */
export function staleAskKeys(keys: readonly string[], liveRoomIds: readonly string[]): string[] {
  const live = new Set(liveRoomIds);
  return keys.filter((k) => {
    const room = askKeyRoom(k);
    return room !== null && !live.has(room);
  });
}

/** The newest `keep` turns, oldest first. */
export function trimHistory(turns: readonly AskTurn[], keep: number = ASK_LIMITS.keep): AskTurn[] {
  return turns.slice(Math.max(0, turns.length - keep));
}

const isTurn = (t: unknown): t is AskTurn =>
  !!t &&
  typeof (t as AskTurn).q === 'string' &&
  typeof (t as AskTurn).a === 'string' &&
  typeof (t as AskTurn).at === 'number' &&
  Number.isFinite((t as AskTurn).at);

/** A stored history; anything unreadable is an empty history (bad turns are dropped, never shown). */
export function parseHistory(raw: string | null): AskTurn[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? trimHistory(value.filter(isTurn)) : [];
  } catch {
    return [];
  }
}

/** The question as sent, or null when it cannot be sent (empty after trimming, or over 300 characters). */
export function askQuestion(text: string): string | null {
  const q = text.trim();
  return q.length >= 1 && [...q].length <= ASK_LIMITS.question ? q : null;
}

const cap = (s: string) => {
  const chars = [...s];
  return chars.length <= ASK_LIMITS.question ? s : chars.slice(0, ASK_LIMITS.question).join('');
};

/** The last 4 turns, each side cut to 300 characters (10.3 bounds). */
export function requestHistory(turns: readonly AskTurn[]): { q: string; a: string }[] {
  return trimHistory(turns, ASK_LIMITS.send).map((t) => ({ q: cap(t.q), a: cap(t.a) }));
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** The `me` field: time, distance and activity must be valid, or nothing is sent; a null or bad pace is left out. */
export function requestMe(me: AskMe | null | undefined): Partial<AskMe> | undefined {
  if (!me || !finite(me.elapsedSec) || !finite(me.distanceM)) return undefined;
  if (me.activity !== 'moving' && me.activity !== 'stopped') return undefined;
  const out: Partial<AskMe> = { elapsedSec: me.elapsedSec, distanceM: me.distanceM };
  if (finite(me.paceSecPerKm)) out.paceSecPerKm = me.paceSecPerKm;
  out.activity = me.activity;
  return out;
}

/** A point as the pace engine keeps it. */
export type AskPoint = { latitude: number; longitude: number };

const coord = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max;

/**
 * Bug (b): the `anchor` the server measures progress from when the room has no route. Same order as the pace engine
 * (engine.ts: `ctx.place ?? tracker.firstPoint`): the room's place pin, else my own start point, else (s11) my first
 * point shared in this room during this app run. Only the room's pin or my own position, never anyone else's;
 * undefined (left out) when none is a valid coordinate.
 */
export function askAnchor(
  place: AskPoint | null | undefined,
  myStart: AskPoint | null | undefined,
  myFirstShared?: AskPoint | null,
): { lat: number; lng: number } | undefined {
  for (const p of [place, myStart, myFirstShared]) {
    if (p && coord(p.latitude, 90) && coord(p.longitude, 180)) return { lat: p.latitude, lng: p.longitude };
  }
  return undefined;
}

/** The 10.3 request body. Optional fields are left out, not sent as null. */
export function askBody(
  roomId: string,
  question: string,
  history: readonly AskTurn[],
  me?: AskMe | null,
  tz?: string,
  anchor?: { lat: number; lng: number },
): Record<string, unknown> {
  const body: Record<string, unknown> = { action: 'ask', roomId, question };
  const h = requestHistory(history);
  if (h.length) body.history = h;
  const m = requestMe(me);
  if (m) body.me = m;
  if (tz) body.tz = tz;
  if (anchor) body.anchor = { lat: anchor.lat, lng: anchor.lng };
  return body;
}

/** A 200 answer, or null when the body is not `{answer: non-empty string, usage}` (then it is ai_failed). */
export function parseAskAnswer(
  data: unknown,
): { answer: string; usage: { input: number; output: number }; cardId?: string } | null {
  const d = data as { answer?: unknown; usage?: { input?: unknown; output?: unknown }; card?: { id?: unknown } } | null;
  if (!d || typeof d.answer !== 'string' || !d.answer.trim()) return null;
  const input = typeof d.usage?.input === 'number' ? d.usage.input : 0;
  const output = typeof d.usage?.output === 'number' ? d.usage.output : 0;
  const cardId = typeof d.card?.id === 'string' && d.card.id ? d.card.id : undefined;
  return { answer: d.answer.trim(), usage: { input, output }, ...(cardId ? { cardId } : {}) };
}

/** How far a card's creation may sit from a turn without a cardId (older history) and still be its thread. */
export const THREAD_MATCH_MS = 120_000;

/**
 * UX2-47: one thread per question. Each turn gets the card Trok created for it: by cardId, else (history saved
 * before cardId) the unused card with the same question created within THREAD_MATCH_MS of the turn. `rest`: my
 * cards no turn claims (history trimmed or cleared), shown as threads of their own.
 */
export function threadCards<C extends { id: string; question: string; createdAt: number }>(
  turns: readonly AskTurn[],
  cards: readonly C[],
): { byTurn: (C | null)[]; rest: C[] } {
  const used = new Set<string>();
  const byTurn = turns.map((t) => {
    const card = t.cardId ? cards.find((c) => c.id === t.cardId && !used.has(c.id)) : undefined;
    if (card) {
      used.add(card.id);
      return card;
    }
    return null;
  });
  turns.forEach((t, i) => {
    if (byTurn[i] || t.cardId) return;
    const q = t.q.trim();
    const card = cards.find(
      (c) => !used.has(c.id) && c.question.trim() === q && Math.abs(c.createdAt - t.at) <= THREAD_MATCH_MS,
    );
    if (card) {
      used.add(card.id);
      byTurn[i] = card;
    }
  });
  return { byTurn, rest: cards.filter((c) => !used.has(c.id)) };
}

/**
 * Errors the ask screen handles; every other contract error reads as ai_failed there. `not_member` (left, removed,
 * or the room ended) is not shown: the screen closes and deletes this room's history.
 */
// capacity B item 4: plan_limit (402) = the caller is Free; Ask follows the caller's own plan.
// UX2-10: rate_limited (the per-minute burst limit) gets its own fixable line instead of "could not finish".
export type AskError = 'not_consented' | 'ask_limit' | 'rate_limited' | 'ai_failed' | 'network' | 'not_member' | 'plan_limit';

export function askErrorKind(error: string): AskError {
  return error === 'not_consented' ||
    error === 'ask_limit' ||
    error === 'rate_limited' ||
    error === 'network' ||
    error === 'not_member' ||
    error === 'plan_limit'
    ? error
    : 'ai_failed';
}
