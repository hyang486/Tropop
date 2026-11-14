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
export function emergencyAreaMode(o: { loading: boolean; error: unknown; count: number }): 'none' | 'failed' | 'list' {
  if (o.loading) return 'none';
  if (o.error != null) return 'failed';
  return o.count > 0 ? 'list' : 'none';
}

/** UX2-30: in chat, three or more Emergencies fold into one "N Emergencies · Show" line until it is opened. */
export const EMERGENCY_FOLD_AT = 3;
export function emergenciesFolded(o: { place: 'chat' | 'other'; count: number; shown: boolean }): boolean {
  return o.place === 'chat' && o.count >= EMERGENCY_FOLD_AT && !o.shown;
}

export function emergencyBarMode(o: {
  place: 'chat' | 'other';
  mine: boolean;
  acked: boolean;
  expanded: boolean;
}): 'bar' | 'line' {
  if (o.expanded) return 'bar';
  if (o.place === 'other') return 'line';
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
