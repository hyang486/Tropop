// Pure helpers for open Emergencies (no React Native imports, so `npm test` can load them).

/**
 * #12: who has seen an Emergency, for its card. Only current members are named and counted (the "of N" total
 * is the current members other than the sender), so the names and the count always agree.
 */
export function seenSummary(
  ackedBy: Iterable<string>,
  names: ReadonlyMap<string, string>,
): { who: string[]; seen: number } {
  const who: string[] = [];
  for (const id of ackedBy) {
    const name = names.get(id);
    if (name !== undefined) who.push(name);
  }
  return { who, seen: who.length };
}

/**
 * UX2-126: the seen part of an Emergency, the same on every surface. The count comes from `ackedBy`, so it is
 * known even while `names` is null (UX2-79 follow-up); only the names and the total wait for the members read.
 */
export function seenPart(o: {
  mine: boolean;
  ackedBy: ReadonlySet<string>;
  names: ReadonlyMap<string, string> | null;
  /** `en.activity` (passed in so this file stays free of app imports). */
  copy: {
    waitingSeen: string;
    noOneSeen: string;
    seenByCount: (n: number) => string;
    seenByNames: (who: string[], n: number, total: number) => string;
  };
}): { visible: string; spoken: string } {
  const zero = (text: string) => ({ visible: text, spoken: text });
  if (o.names === null) {
    const n = o.ackedBy.size;
    if (n === 0) return zero(o.mine ? o.copy.waitingSeen : o.copy.noOneSeen);
    return zero(o.copy.seenByCount(n));
  }
  const { who, seen } = seenSummary(o.ackedBy, o.names);
  if (seen === 0) return zero(o.mine ? o.copy.waitingSeen : o.copy.noOneSeen);
  const text = o.copy.seenByNames(who, seen, Math.max(0, o.names.size - 1));
  return { visible: text, spoken: spokenSeparators(text) };
}

/**
 * UX2-79: who sent an Emergency. `names` is null while the member list is not known yet or its read failed, so a
 * current member never reads as "Former member"; "former" only when the read worked and the id is missing.
 */
export function emergencySender(
  names: ReadonlyMap<string, string> | null,
  userId: string,
): { kind: 'unknown' } | { kind: 'former' } | { kind: 'name'; name: string } {
  if (names === null) return { kind: 'unknown' };
  const name = names.get(userId);
  return name === undefined ? { kind: 'former' } : { kind: 'name', name };
}

/**
 * One vibration per Emergency for the whole app, however many screens show its banner (the chat screen stays
 * mounted under Map and Photos). The first load of each screen only records what is already open, so opening
 * a screen never re-announces an Emergency.
 */
export function createAnnouncer() {
  const announced = new Set<string>();
  return {
    /** Ids already open when a screen first loads: remembered, not announced. */
    seed(ids: Iterable<string>) {
      for (const id of ids) announced.add(id);
    },
    /** The ids not announced before; they are remembered, so a second screen gets an empty list. */
    fresh(ids: Iterable<string>): string[] {
      const out: string[] = [];
      for (const id of ids) {
        if (announced.has(id)) continue;
        announced.add(id);
        out.push(id);
      }
      return out;
    },
  };
}

/**
 * UX P0-1: an open Emergency shows as a 60 pt pinned bar (title, time and seen count, one action) or a 44 pt line
 * ("Sora · Emergency · Open"). Chat shows the bar until you said "I see it"; your own Emergency keeps the bar there
 * so "I'm OK now" stays one tap away. Map, Photos and Info show the line. "Open" on a line expands that bar.
 */
/**
 * UX2-05: what the pinned Emergency area shows. A failed read is 'failed' (pattern E with "Try again"), never an empty
 * area, because nothing pinned would read as "no Emergency" when we do not know. Earlier Emergencies stay listed below.
 */
export function emergencyAreaMode(o: {
  loading: boolean;
  error: unknown;
  count: number;
  /** UX2-107: the room channel has been down for over 5 s, so the list may be out of date. */
  stale?: boolean;
  /** UX2-107: the first read has taken over 3 s. */
  slow?: boolean;
}): 'none' | 'checking' | 'failed' | 'list' {
  if (o.stale) return 'failed';
  if (o.loading) return o.slow ? 'checking' : 'none';
  if (o.error != null) return 'failed';
  return o.count > 0 ? 'list' : 'none';
}

/**
 * C39 (UX2-126): what the Emergency bar's location line shows. A found row wins even after a later failed read;
 * "No location shared" only after a read that worked; unknown is blank for the first 1 s, then "Checking location…".
 */
export function locationLineState(o: {
  shared: boolean;
  loaded: boolean;
  error: boolean;
  late: boolean;
}): 'shared' | 'none' | 'failed' | 'checking' | 'blank' {
  if (o.shared) return 'shared';
  if (o.error) return 'failed';
  if (o.loaded) return 'none';
  return o.late ? 'checking' : 'blank';
}

/**
 * UX2-110: the Qrewing AI disclosure sheet waits while any Emergency is open or the area is failed (or not read
 * yet, so it can't cover one that is about to show). It shows once the Emergency ends, or on the next open.
 * ux guard: if the first read took over 3 s (`slow`, which stays set for the visit), skip it for this visit so it
 * never pops up late.
 */
export function disclosureHeld(o: Parameters<typeof emergencyAreaMode>[0]): boolean {
  return o.loading || !!o.slow || emergencyAreaMode(o) === 'list' || emergencyAreaMode(o) === 'failed';
}

/** UX2-30: in chat, three or more Emergencies fold into one "N Emergencies · Show" line until it is opened. */
export const EMERGENCY_FOLD_AT = 3;
export function emergenciesFolded(o: { place: 'chat' | 'other' | 'map'; count: number; shown: boolean }): boolean {
  return o.place === 'chat' && o.count >= EMERGENCY_FOLD_AT && !o.shown;
}

export function emergencyBarMode(o: {
  place: 'chat' | 'other' | 'map';
  mine: boolean;
  acked: boolean;
  expanded: boolean;
}): 'bar' | 'line' {
  if (o.expanded) return 'bar';
  // V4: Map shows the line as a redwash capsule; like the other non-chat screens it starts as a line.
  if (o.place !== 'chat') return 'line';
  return o.mine || !o.acked ? 'bar' : 'line';
}

/**
 * UX2-52 server guard: set_my_status raises PT409 'emergency_active' for an ordinary status during Emergency.
 * Both must match: PT409 alone also means "room full" (join_room).
 */
export function isEmergencyActiveError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'PT409' && message === 'emergency_active';
}

/**
 * UX2-05b: the status picker's tiles. Emergency is always first: the room's own row, or a built-in tile when the
 * list failed with no cached copy (the write then resolves the room's Emergency id). Clear status only when my
 * current status is known and set. The error line shows whenever the last read failed.
 */
export function statusPickerPlan<S extends { id: string; is_emergency: boolean }>(o: {
  statuses: readonly S[];
  currentId: string | undefined;
  failed: boolean;
}): { emergency: S | 'builtin'; others: S[]; showClear: boolean; showError: boolean; inEmergency: boolean } {
  const emergency = o.statuses.find((s) => s.is_emergency) ?? 'builtin';
  const others = o.statuses.filter((s) => !s.is_emergency);
  // UX2-52: Emergency and an ordinary status share one slot (member_status.status_id), and set_my_status logs
  // "is OK (Emergency resolved)" when it overwrites Emergency. So while in Emergency only "I'm OK now" ends it.
  const inEmergency = emergency !== 'builtin' && !!o.currentId && emergency.id === o.currentId;
  const showClear = !inEmergency && !!o.currentId && o.statuses.some((s) => s.id === o.currentId);
  return { emergency, others, showClear, showError: o.failed, inEmergency };
}

/** UX2-77b: one VoiceOver sentence from parts. Each part loses its trailing periods, empty parts drop, and the parts join with ". ". */
export function spokenSentence(parts: string[]): string {
  const kept = parts.map((p) => p.trim().replace(/\.+$/, '')).filter(Boolean);
  return kept.length ? `${kept.join('. ')}.` : '';
}

/** UX2-77c: VoiceOver reads "·" inconsistently, so spoken labels use ", " in its place. Visible text keeps "·". */
export function spokenSeparators(text: string): string {
  return text.replace(/\s*·\s*/g, ', ');
}

/**
 * UX2-114: the red line above End room / End activity / Leave while an Emergency is open, or null for none.
 * End: one open Emergency is named ("Mina's Emergency is still open. …"), two or more give the count. The name
 * line is nameless until the member names load (or when they fail / lack this member, ux C36). Leave: only my own
 * open Emergency matters.
 */
export function endEmergencyNote(o: {
  kind: 'room' | 'activity' | 'leave';
  emergencies: readonly { userId: string }[];
  userId: string | undefined;
  names: ReadonlyMap<string, string> | null;
  copy: {
    endRoomOne: (name: string) => string;
    endActivityOne: (name: string) => string;
    many: (n: number) => string;
    endRoomNameless: string;
    endActivityNameless: string;
    leaveMine: string;
  };
}): string | null {
  const { kind, emergencies, userId, names, copy } = o;
  if (kind === 'leave') return userId && emergencies.some((e) => e.userId === userId) ? copy.leaveMine : null;
  if (emergencies.length === 0) return null;
  if (emergencies.length > 1) return copy.many(emergencies.length);
  const name = names?.get(emergencies[0].userId);
  if (!name) return kind === 'room' ? copy.endRoomNameless : copy.endActivityNameless;
  return kind === 'room' ? copy.endRoomOne(name) : copy.endActivityOne(name);
}

/**
 * UX2-114 (ux C36 b): the line shown when no Emergency note is: 'failed' when the activity read failed, 'checking'
 * when it has taken over 3 s (slow), else null. A note known from an earlier read wins over both.
 */
export function emergencyCheckLine(o: {
  loading: boolean;
  error: unknown;
  slow: boolean;
  hasNote: boolean;
}): 'failed' | 'checking' | null {
  if (o.hasNote) return null;
  if (o.error) return 'failed';
  return o.loading && o.slow ? 'checking' : null;
}

/** VoiceOver: a trailing "…" is read as a full stop. */
export function spokenEllipsis(text: string): string {
  return text.replace(/\s*…$/, '.');
}

/**
 * Emergency "On my way" (ux spec 2026-11-14): who is on the way, in answer order with me first as "You". Former
 * members are left out. null when the member names are unknown (the bar then shows only the count).
 */
export function onWayWho(o: {
  userId: string;
  onWay: readonly string[];
  names: ReadonlyMap<string, string> | null;
  you: string;
}): string[] | null {
  if (o.names === null) return null;
  const others: string[] = [];
  for (const id of o.onWay) {
    if (id === o.userId) continue;
    const name = o.names.get(id);
    if (name !== undefined) others.push(name);
  }
  return o.onWay.includes(o.userId) ? [o.you, ...others] : others;
}

/**
 * The bar's on-the-way line, or null to hide it: hidden when nobody is on the way, and when only I am (my own
 * "You're on the way" row already says it).
 */
export function onWayLine(o: {
  userId: string;
  onWay: readonly string[];
  names: ReadonlyMap<string, string> | null;
  copy: { you: string; onWayNames: (who: string[]) => string; onWayCount: (n: number) => string };
}): string | null {
  if (o.onWay.length === 0) return null;
  const who = onWayWho({ userId: o.userId, onWay: o.onWay, names: o.names, you: o.copy.you });
  if (who === null) return o.copy.onWayCount(o.onWay.length);
  if (who.length === 0 || (who.length === 1 && o.onWay.length === 1 && o.onWay[0] === o.userId)) return null;
  return o.copy.onWayNames(who);
}

/**
 * Before 0040 is live, selecting emergency_acks.on_way fails with 42703 (undefined column). The read then falls
 * back to the seen columns and the bar keeps today's "I see it" only.
 */
export function ackColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === '42703') return true;
  return typeof e.message === 'string' && /on_way/.test(e.message) && /does not exist|column/i.test(e.message);
}
