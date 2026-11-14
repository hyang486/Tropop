/**
 * UX3-B09 (S3): one ink check per message and member (migration 0038 `message_reactions`). Pure helpers so the
 * hook and the row stay thin and the rules are testable.
 */
export type CheckRow = { message_id: string; user_id: string };
export type CheckSummary = { count: number; mine: boolean; userIds: string[] };

/** Groups the room's check rows by message, oldest first as the server returned them. */
export function summarizeChecks(rows: readonly CheckRow[], userId: string | null | undefined): Map<string, CheckSummary> {
  const out = new Map<string, CheckSummary>();
  for (const r of rows) {
    const cur = out.get(r.message_id) ?? { count: 0, mine: false, userIds: [] };
    if (cur.userIds.includes(r.user_id)) continue;
    cur.userIds.push(r.user_id);
    cur.count += 1;
    if (r.user_id === userId) cur.mine = true;
    out.set(r.message_id, cur);
  }
  return out;
}

/** The optimistic local state after this member toggles their check on a message. */
export function toggleCheckRows(rows: readonly CheckRow[], messageId: string, userId: string): CheckRow[] {
  const had = rows.some((r) => r.message_id === messageId && r.user_id === userId);
  return had
    ? rows.filter((r) => !(r.message_id === messageId && r.user_id === userId))
    : [...rows, { message_id: messageId, user_id: userId }];
}

/** Text bubbles and media blocks take a check; system lines and unsent (sending/failed) messages do not. */
export function canCheck(item: { kind: string; pending?: string }, isMediaBlock: boolean): boolean {
  if (item.pending) return false;
  if (item.kind === 'text') return true;
  return item.kind === 'media' && isMediaBlock;
}

const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

/**
 * The app can ship before migration 0038 is live. Checks turn on only after a successful read; a missing
 * relation turns them off (no menu, no double-tap, text stays selectable); any other error keeps the last state.
 */
export function nextChecksReady(prev: boolean, error: { code?: string } | null): boolean {
  if (!error) return true;
  if (error.code && MISSING_TABLE.has(error.code)) return false;
  return prev;
}
