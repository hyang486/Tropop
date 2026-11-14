/**
 * UX3-B04: system lines stop drowning the conversation.
 * (a) Day separators: "Today", "Yesterday", or "Sat, Nov 14" before each day's first item.
 * (b) Runs of 3+ consecutive system lines (no message between, same day) collapse into one line with "Show".
 *     Joins combine ("Jun and Sora joined"); one person's Emergency/OK flips read "Sora set Emergency and is OK
 *     now · 4 times". An Emergency that is still open is never collapsed. The "Activity started" line stays
 *     (it links to Map).
 * (c) Display copy: "X is OK (Emergency resolved)" reads "X is OK now" (stored text is unchanged).
 * Pure (no React Native), on the inverted newest-first list, after the small-talk collapse.
 */

export type LineItem = { id: string; kind: string; sender_id: string | null; body: string | null; created_at: string };
type In<T> = { type: 'message'; item: T } | { type: 'hidden'; key: string; ids: string[] };
export type TimelineRow<T> =
  | In<T>
  | { type: 'day'; key: string; label: string }
  | { type: 'sysrun'; key: string; items: T[]; summary: string };

// Same text as lib/chat-line.ts (the server line from migration 0024); that line links to Map.
const ACTIVITY_STARTED = 'Activity started. Open Map to share your location.';
const SYSTEM_KINDS = new Set(['system', 'arrival', 'status', 'emergency']);
const JOINED = /^(.+) joined$/;
const RESOLVED = /^(.+) is OK \(Emergency resolved\)(?: · (.+))?$/;
const EMERGENCY = /^(.+) needs help \(Emergency\)$/;
export const MIN_RUN = 3;

/** Copy (en.chat.timeline). */
export type TimelineCopy = {
  today: string;
  yesterday: string;
  and: (a: string, b: string) => string;
  others: (n: number) => string;
  joined: (names: string) => string;
  emergencyFlips: (name: string, ok: boolean) => string;
  times: (n: number) => string;
  more: (n: number) => string;
  okNow: (name: string) => string;
};

/** (c) The resolved line without the parenthetical. Other bodies are returned unchanged. */
export function resolvedCopy(body: string, copy: Pick<TimelineCopy, 'okNow'>): string {
  const m = RESOLVED.exec(body);
  if (!m) return body;
  return m[2] ? `${copy.okNow(m[1])} · ${m[2]}` : copy.okNow(m[1]);
}

/** Local midnight of a time, as a day key. */
function dayStart(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today", "Yesterday", or "Sat, Nov 14". `format` is injected so tests don't depend on the locale. */
export function dayLabel(ms: number, nowMs: number, format: (ms: number) => string, copy: TimelineCopy): string {
  const diff = Math.round((dayStart(nowMs) - dayStart(ms)) / 86_400_000);
  if (diff === 0) return copy.today;
  if (diff === 1) return copy.yesterday;
  return format(ms);
}

function names(list: string[], copy: TimelineCopy): string {
  const uniq = [...new Set(list)];
  if (uniq.length === 1) return uniq[0];
  if (uniq.length === 2) return copy.and(uniq[0], uniq[1]);
  if (uniq.length === 3) return copy.and(`${uniq[0]}, ${uniq[1]}`, uniq[2]);
  return copy.and(`${uniq[0]}, ${uniq[1]}`, copy.others(uniq.length - 2));
}

/** The one-line summary of a collapsed run (items newest first). */
export function runSummary(
  items: readonly LineItem[],
  lineText: (item: LineItem) => string,
  copy: TimelineCopy,
): string {
  const oldestFirst = items.slice().reverse();
  const joins = oldestFirst.map((i) => (i.kind === 'system' ? JOINED.exec(i.body ?? '') : null));
  if (joins.every(Boolean)) return copy.joined(names(joins.map((m) => (m as RegExpExecArray)[1]), copy));
  const flips = oldestFirst.map((i) =>
    i.kind === 'emergency' ? EMERGENCY.exec(i.body ?? '') : i.kind === 'status' ? RESOLVED.exec(i.body ?? '') : null,
  );
  const senders = new Set(items.map((i) => i.sender_id));
  if (flips.every(Boolean) && senders.size === 1) {
    const who = (flips[0] as RegExpExecArray)[1];
    const times = items.filter((i) => i.kind === 'emergency').length;
    const ok = items[0].kind === 'status';
    const what = copy.emergencyFlips(who, ok);
    return times > 1 ? `${what} · ${copy.times(times)}` : what;
  }
  return `${lineText(items[0])} · ${copy.more(items.length - 1)}`;
}

/**
 * rows: newest first. openEmergencyUsers: members whose Emergency is open now; their newest Emergency line is
 * never collapsed. expanded: run keys the user opened with "Show".
 */
export function buildTimeline<T extends LineItem>(
  rows: readonly In<T>[],
  opts: {
    nowMs: number;
    openEmergencyUsers: ReadonlySet<string>;
    expanded: ReadonlySet<string>;
    formatDay: (ms: number) => string;
    lineText: (item: T) => string;
    copy: TimelineCopy;
  },
): TimelineRow<T>[] {
  // The newest Emergency line of each member whose Emergency is still open.
  const pinned = new Set<string>();
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.type !== 'message' || r.item.kind !== 'emergency' || !r.item.sender_id) continue;
    if (opts.openEmergencyUsers.has(r.item.sender_id) && !seen.has(r.item.sender_id)) {
      seen.add(r.item.sender_id);
      pinned.add(r.item.id);
    }
  }
  const collapsible = (r: In<T>, day: number | null): r is { type: 'message'; item: T } =>
    r.type === 'message' &&
    SYSTEM_KINDS.has(r.item.kind) &&
    !pinned.has(r.item.id) &&
    !(r.item.kind === 'system' && r.item.body === ACTIVITY_STARTED) &&
    (day === null || dayStart(Date.parse(r.item.created_at)) === day);

  const out: TimelineRow<T>[] = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (collapsible(r, null)) {
      const day = dayStart(Date.parse(r.item.created_at));
      let j = i;
      while (j < rows.length && collapsible(rows[j], day)) j++;
      const run = rows.slice(i, j) as { type: 'message'; item: T }[];
      // Key: the oldest line's id, stable while newer lines arrive at the front.
      const key = `sysrun-${run[run.length - 1].item.id}`;
      if (run.length >= MIN_RUN && !opts.expanded.has(key)) {
        const items = run.map((x) => x.item);
        out.push({ type: 'sysrun', key, items, summary: runSummary(items, opts.lineText as (i: LineItem) => string, opts.copy) });
      } else {
        out.push(...run);
      }
      i = j;
    } else {
      out.push(r);
      i++;
    }
  }

  // (a) Day separators: inverted list, so the label follows (in array order) the oldest item of each day.
  const timeOf = (row: TimelineRow<T>): number | null =>
    row.type === 'message' ? Date.parse(row.item.created_at) : row.type === 'sysrun' ? Date.parse(row.items[0].created_at) : null;
  const withDays: TimelineRow<T>[] = [];
  for (let k = 0; k < out.length; k++) {
    withDays.push(out[k]);
    const t = timeOf(out[k]);
    if (t === null) continue;
    let older: number | null = null;
    for (let m = k + 1; m < out.length && older === null; m++) older = timeOf(out[m]);
    if (older === null || dayStart(older) !== dayStart(t)) {
      withDays.push({ type: 'day', key: `day-${dayStart(t)}`, label: dayLabel(t, opts.nowMs, opts.formatDay, opts.copy) });
    }
  }
  return withDays;
}
