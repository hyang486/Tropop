// Pure logic for the event features (entry form, consent gate, Mute small talk). No React Native imports, so
// `npm test` can load it.

/** Spec 1.3 limits; the server checks the same (22023). */
export const ENTRY_LIMITS = { headline: 80, interests: 300, lookingFor: 300, links: 3, link: 200 } as const;

export type EntryInput = { headline: string; interests: string; lookingFor: string; links: string[] };
export type EntryProblem = 'headlineRequired' | 'headlineTooLong' | 'interestsTooLong' | 'lookingForTooLong' | 'tooManyLinks' | 'linkInvalid';

/** Trims every field and drops empty links; returns the value to send or the first problem. */
export function validateEntry(input: EntryInput): { value: EntryInput } | { problem: EntryProblem } {
  const headline = input.headline.trim();
  const interests = input.interests.trim();
  const lookingFor = input.lookingFor.trim();
  const links = input.links.map((l) => l.trim()).filter((l) => l.length > 0);
  if (!headline) return { problem: 'headlineRequired' };
  if (headline.length > ENTRY_LIMITS.headline) return { problem: 'headlineTooLong' };
  if (interests.length > ENTRY_LIMITS.interests) return { problem: 'interestsTooLong' };
  if (lookingFor.length > ENTRY_LIMITS.lookingFor) return { problem: 'lookingForTooLong' };
  if (links.length > ENTRY_LIMITS.links) return { problem: 'tooManyLinks' };
  if (links.some((l) => !/^https:\/\/\S+$/i.test(l) || l.length > ENTRY_LIMITS.link)) return { problem: 'linkInvalid' };
  return { value: { headline, interests, lookingFor, links } };
}

type Me = { aiOk: boolean; mute: boolean } | null;

/** The disclosure shows once per member per AI room: until they answer (Agree or Not now both create their row). */
export function needsDisclosure(aiEnabled: boolean, me: Me): boolean {
  return aiEnabled && me === null;
}

/** Client gate before chat: event rooms that ask for entry info, for members who have not filled it in. */
export function needsEntry(entryRequired: boolean, roomType: string, hasProfile: boolean | null): boolean {
  return entryRequired && roomType === 'event' && hasProfile === false;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when `body` mentions `displayName` as a whole word (case-insensitive, optional leading @). Marked
 * important without AI (spec 3.2). Names shorter than 2 characters never match, to avoid noise.
 */
export function mentionsName(body: string | null | undefined, displayName: string | null | undefined): boolean {
  const name = displayName?.trim();
  if (!body || !name || name.length < 2) return false;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])@?${escapeRegExp(name)}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
  return re.test(body);
}

export type ChatLike = { id: string; kind: string; sender_id: string | null; body: string | null };
export type Importance = { important: boolean; reason: string | null };

/**
 * Whether a row stays visible while Mute small talk is on. Only text from someone else can be hidden; it stays
 * when it is flagged important or mentions me. Notices (arrival, status, emergency, media, system) and my own
 * messages always show.
 */
export function staysVisible(
  item: ChatLike,
  userId: string | undefined,
  myName: string | undefined,
  flags: ReadonlyMap<string, Importance>,
): boolean {
  if (item.kind !== 'text') return true;
  if (!item.sender_id || item.sender_id === userId) return true;
  if (flags.get(item.id)?.important) return true;
  return mentionsName(item.body, myName);
}

export type MutedRow<T> = { type: 'message'; item: T } | { type: 'hidden'; key: string; ids: string[] };

/**
 * Collapses each run of hidden rows into one "N messages hidden" row (still reachable: `expanded` keys show
 * the run again). Order is kept, so it works on the inverted (newest first) list too. A run's key is its
 * last id (the oldest in a newest-first list), which stays stable while new messages arrive at the front.
 */
export function collapseSmallTalk<T extends ChatLike>(
  items: readonly T[],
  visible: (item: T) => boolean,
  expanded: ReadonlySet<string>,
): MutedRow<T>[] {
  const out: MutedRow<T>[] = [];
  let run: T[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const key = `hidden-${run[run.length - 1].id}`;
    if (expanded.has(key)) for (const item of run) out.push({ type: 'message', item });
    else out.push({ type: 'hidden', key, ids: run.map((r) => r.id) });
    run = [];
  };
  for (const item of items) {
    if (visible(item)) {
      flush();
      out.push({ type: 'message', item });
    } else {
      run.push(item);
    }
  }
  flush();
  return out;
}

/**
 * Batches new message ids for triage (spec 3.2: up to 5 within 2 s). `add` starts the timer on the first id;
 * a full batch flushes at once. Timers are injected so tests run without waiting.
 */
export function createTriageBatcher(opts: {
  flush: (ids: string[]) => void;
  maxBatch?: number;
  delayMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}) {
  const maxBatch = opts.maxBatch ?? 5;
  const delayMs = opts.delayMs ?? 2_000;
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let pending: string[] = [];
  const seen = new Set<string>();
  let timer: unknown = null;

  function run() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (pending.length === 0) return;
    const ids = pending;
    pending = [];
    opts.flush(ids);
  }

  return {
    add(id: string) {
      if (seen.has(id)) return;
      seen.add(id);
      pending.push(id);
      if (pending.length >= maxBatch) run();
      else if (timer === null) timer = setTimer(run, delayMs);
    },
    flushNow: run,
    cancel() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      pending = [];
    },
  };
}
