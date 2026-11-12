// Pure rules for the private Qrewing chat (planning/QREWING_AI_SPEC_EN.md 10.1, 10.3, 10.4): the on-device history,
// the `ask` request body and the errors the ask screen shows. No React Native imports (tested in node).

/** One question and its answer, kept on this device only. `at` is ms since epoch. */
export type AskTurn = { q: string; a: string; at: number };

/** The asker's own activity (developer-pace currentPaceSnapshot), sent only for the asker. */
export type AskMe = { elapsedSec: number; distanceM: number; paceSecPerKm: number; activity: 'moving' | 'stopped' };

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

/** The `me` field: only a whole, non-negative snapshot is sent; otherwise none. */
export function requestMe(me: AskMe | null | undefined): AskMe | undefined {
  if (!me || !finite(me.elapsedSec) || !finite(me.distanceM) || !finite(me.paceSecPerKm)) return undefined;
  if (me.activity !== 'moving' && me.activity !== 'stopped') return undefined;
  return { elapsedSec: me.elapsedSec, distanceM: me.distanceM, paceSecPerKm: me.paceSecPerKm, activity: me.activity };
}

/** The 10.3 request body. Optional fields are left out, not sent as null. */
export function askBody(
  roomId: string,
  question: string,
  history: readonly AskTurn[],
  me?: AskMe | null,
  tz?: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = { action: 'ask', roomId, question };
  const h = requestHistory(history);
  if (h.length) body.history = h;
  const m = requestMe(me);
  if (m) body.me = m;
  if (tz) body.tz = tz;
  return body;
}

/** A 200 answer, or null when the body is not `{answer: non-empty string, usage}` (then it is ai_failed). */
export function parseAskAnswer(data: unknown): { answer: string; usage: { input: number; output: number } } | null {
  const d = data as { answer?: unknown; usage?: { input?: unknown; output?: unknown } } | null;
  if (!d || typeof d.answer !== 'string' || !d.answer.trim()) return null;
  const input = typeof d.usage?.input === 'number' ? d.usage.input : 0;
  const output = typeof d.usage?.output === 'number' ? d.usage.output : 0;
  return { answer: d.answer.trim(), usage: { input, output } };
}

/** Errors the ask screen names; every other contract error reads as ai_failed there. */
export type AskError = 'not_consented' | 'ask_limit' | 'ai_failed' | 'network';

export function askErrorKind(error: string): AskError {
  return error === 'not_consented' || error === 'ask_limit' || error === 'network' ? error : 'ai_failed';
}
