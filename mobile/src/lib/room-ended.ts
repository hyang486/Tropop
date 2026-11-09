// Pure helpers for the Qrew "This room has ended" screen (Q 06.04). No React Native imports, so `npm test`
// can load them.

/** The room fields the ended screen reads. */
export type EndedRoomFields = { deleted_at: string | null; expires_at: string };

/**
 * When the room closed, only when the client actually knows it: the host's end time (deleted_at) or an end
 * time that has passed (expires_at <= now). Null when the room row is gone (RLS hides it once it closes, or the
 * user left) or it has not closed yet. Never a guess.
 */
export function roomClosedAtMs(room: EndedRoomFields | null | undefined, nowMs: number): number | null {
  if (!room) return null;
  if (room.deleted_at !== null) {
    const ended = new Date(room.deleted_at).getTime();
    return Number.isFinite(ended) ? ended : null;
  }
  const expires = new Date(room.expires_at).getTime();
  return Number.isFinite(expires) && expires <= nowMs ? expires : null;
}

/** True when both times fall on the same local calendar day (the line then shows the time only). */
export function sameLocalDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
