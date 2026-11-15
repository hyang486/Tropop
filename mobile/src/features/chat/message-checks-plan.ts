/**
 * UX3-B09 (S3): one ink check per message and member (migration 0038 `message_reactions`). Pure helpers so the
 * hook and the row stay thin and the rules are testable.
 */
export type CheckRow = { message_id: string; user_id: string };
/** B3 (0043): a reaction row. `reaction` is absent before 0043 is live; the old ink check is reaction 2 ("Got it"). */
export type ReactionRowFull = CheckRow & { reaction?: number | null };
export const CHECK_REACTION = 2;

/** Splits the room's rows: reaction 2 (or no column yet) is the check; every other reaction is a chip. */
export function splitReactionRows(rows: readonly ReactionRowFull[]): { checks: CheckRow[]; reactions: Map<string, { user_id: string; reaction: number }[]> } {
  const checks: CheckRow[] = [];
  const reactions = new Map<string, { user_id: string; reaction: number }[]>();
  for (const r of rows) {
    if (r.reaction == null || r.reaction === CHECK_REACTION) {
      checks.push({ message_id: r.message_id, user_id: r.user_id });
    } else {
      const list = reactions.get(r.message_id) ?? [];
      list.push({ user_id: r.user_id, reaction: r.reaction });
      reactions.set(r.message_id, list);
    }
  }
  return { checks, reactions };
}

/** Optimistic toggle of one (message, user, reaction) row; reaction 2 is the check. */
export function toggleReactionRows(rows: readonly ReactionRowFull[], messageId: string, userId: string, reaction: number): ReactionRowFull[] {
  const same = (r: ReactionRowFull) => r.message_id === messageId && r.user_id === userId && (r.reaction ?? CHECK_REACTION) === reaction;
  return rows.some(same) ? rows.filter((r) => !same(r)) : [...rows, { message_id: messageId, user_id: userId, reaction }];
}

/** Text, media and sticker messages take a reaction (the server also refuses other kinds with not_reactable). */
export function canReact(item: { kind: string; pending?: string }): boolean {
  return !item.pending && (item.kind === 'text' || item.kind === 'media' || item.kind === 'sticker');
}
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
  if (item.kind === 'text' || item.kind === 'sticker') return true;
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
