// Pure helpers for open Emergencies (no React Native imports, so `npm test` can load them).

/**
 * #12: who has seen an Emergency, for its card. `seen` counts current members only (the "of N" total is the
 * current members other than the sender); `who` also names acks from members who have since left, as
 * `formerName`, so the sender still sees that someone saw it.
 */
export function seenSummary(
  ackedBy: Iterable<string>,
  names: ReadonlyMap<string, string>,
  formerName: string,
): { who: string[]; seen: number } {
  const who: string[] = [];
  let seen = 0;
  for (const id of ackedBy) {
    const name = names.get(id);
    if (name !== undefined) seen += 1;
    who.push(name ?? formerName);
  }
  return { who, seen };
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
