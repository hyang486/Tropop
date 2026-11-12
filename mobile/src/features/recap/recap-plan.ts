// Pure logic for the end-of-room recap (spec 3.3 and 7.3). No React Native imports, so `npm test` can load it.

export const RECAP_KEY_PREFIX = 'qrewing.recap.v1.';
/** Which recap calls this device already made for a room, and that the room had Qrewing AI on. */
export const RECAP_MARK_PREFIX = 'qrewing.recap-mark.v1.';

export const FIRST_CALL_MS = 60 * 60_000;
export const REFRESH_CALL_MS = 10 * 60_000;
/** The host's End flow waits at most this long for the recap, in the background (spec 3.3 trigger B). */
export const END_RECAP_TIMEOUT_MS = 15_000;

export function recapKey(roomId: string) {
  return `${RECAP_KEY_PREFIX}${roomId}`;
}
export function recapMarkKey(roomId: string) {
  return `${RECAP_MARK_PREFIX}${roomId}`;
}

export type ServerRecap = { title: string; summary: string; highlights: string[]; generatedAt: string };

/** The per-user part, computed on this device without AI. A null field could not be read. */
export type MyPart = {
  messages: number | null;
  mediaShared: number | null;
  photosOfMe: number | null;
  arrivedAt: string | null;
  pace: string | null;
};

export type SavedRecap = { server: ServerRecap; me: MyPart; savedAt: string };

export type RecapMark = { ai: true; first: boolean; refresh: boolean };

export type RecapStep = 'first' | 'refresh' | 'late';

/** What to mark and whether to send `refresh` for a step. */
export function stepCall(step: RecapStep): { mark: Partial<Pick<RecapMark, 'first' | 'refresh'>>; refresh: boolean } {
  if (step === 'first') return { mark: { first: true }, refresh: false };
  if (step === 'refresh') return { mark: { refresh: true }, refresh: true };
  return { mark: { first: true, refresh: true }, refresh: true };
}

export const EMPTY_MARK: RecapMark = { ai: true, first: false, refresh: false };

/**
 * Spec 7.3 scheduled end: the first time the app sees 60 minutes or less left, ask once; within the last
 * 10 minutes, ask once more with `refresh` (the server decides whether anything changed). Null: nothing to do.
 * First seen with 10 minutes or less left: 'late', one call with `refresh` that counts as both (the server treats a
 * refresh with no done row as a normal recap), so two calls never go out seconds apart.
 * After the end (remaining <= 0) the scheduled path stops; the host's early end has its own call.
 */
export function recapStep(remainingMs: number, mark: RecapMark): RecapStep | null {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null;
  if (remainingMs <= REFRESH_CALL_MS && !mark.first && !mark.refresh) return 'late';
  if (remainingMs <= FIRST_CALL_MS && !mark.first) return 'first';
  if (remainingMs <= REFRESH_CALL_MS && !mark.refresh) return 'refresh';
  return null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}
function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/** Reads a stored recap; anything malformed reads as no recap. */
export function parseSavedRecap(raw: string | null | undefined): SavedRecap | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const s = o.server as Record<string, unknown> | undefined;
  if (!s || typeof s.title !== 'string' || typeof s.summary !== 'string' || !isStringArray(s.highlights)) return null;
  if (typeof o.savedAt !== 'string') return null;
  const m = (o.me ?? {}) as Record<string, unknown>;
  return {
    server: { title: s.title, summary: s.summary, highlights: s.highlights, generatedAt: strOrNull(s.generatedAt) ?? o.savedAt },
    me: {
      messages: numOrNull(m.messages),
      mediaShared: numOrNull(m.mediaShared),
      photosOfMe: numOrNull(m.photosOfMe),
      arrivedAt: strOrNull(m.arrivedAt),
      pace: strOrNull(m.pace),
    },
    savedAt: o.savedAt,
  };
}

export function parseMark(raw: string | null | undefined): RecapMark | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (v?.ai !== true) return null;
    return { ai: true, first: v.first === true, refresh: v.refresh === true };
  } catch {
    return null;
  }
}

/**
 * Keeps the better per-user part when a newer server recap arrives in grace: counts that can no longer be read
 * (messages are closed in grace) keep the earlier value.
 */
export function mergeMyPart(prev: MyPart | null | undefined, next: MyPart): MyPart {
  if (!prev) return next;
  return {
    messages: next.messages ?? prev.messages,
    mediaShared: next.mediaShared ?? prev.mediaShared,
    photosOfMe: next.photosOfMe ?? prev.photosOfMe,
    arrivedAt: next.arrivedAt ?? prev.arrivedAt,
    pace: next.pace ?? prev.pace,
  };
}

/** Resolves with the promise's value, or `fallback` after `ms`. Never rejects. */
export function withTimeout<T, F>(p: Promise<T>, ms: number, fallback: F, setTimer = setTimeout): Promise<T | F> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimer(() => {
      if (done) return;
      done = true;
      resolve(fallback);
    }, ms);
    p.then(
      (v) => {
        if (done) return;
        done = true;
        clearTimeout(t as ReturnType<typeof setTimeout>);
        resolve(v);
      },
      () => {
        if (done) return;
        done = true;
        clearTimeout(t as ReturnType<typeof setTimeout>);
        resolve(fallback);
      },
    );
  });
}

/**
 * What the Room ended recap card shows (spec 3.3, 7.3). `miss` is why the server read gave no recap: `pending`
 * (another member's call is writing it), `offline` (the request never got an answer) or `gone` (any other answer,
 * including the room deleted after grace). Rooms this phone does not know had Qrewing on show only a recap or
 * "still writing" (read in grace).
 */
export type RecapMiss = 'pending' | 'offline' | 'gone';
export type RecapCardView = 'recap' | 'hidden' | 'none' | 'pending' | 'offline';

export function recapCardView(hasSaved: boolean, markAi: boolean, miss: RecapMiss | null): RecapCardView {
  if (hasSaved) return 'recap';
  // Without the mark (the chat was never opened on this phone), only a row read in grace can say anything:
  // a recap being written shows "still writing"; no row (AI off) or a failed read shows nothing.
  if (!markAi) return miss === 'pending' ? 'pending' : 'hidden';
  if (miss === 'pending') return 'pending';
  if (miss === 'offline') return 'offline';
  return 'none';
}
