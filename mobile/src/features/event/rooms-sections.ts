// UX3-A02: Rooms home sections. Pure (no React Native), so tests can load it.

export type RoomSection = 'now' | 'upcoming' | 'ending';

/** Order the sections show in. */
export const ROOM_SECTIONS: readonly RoomSection[] = ['now', 'upcoming', 'ending'];

/**
 * Happening now: the activity started, or the start time passed (a room without a start time is live from the
 * start). Coming up: the start time is still ahead. Ending soon: the host ended it and it is in its grace window
 * (these used to sort last).
 */
export function roomSection(
  room: { activity_state: string; starts_at: string | null },
  grace: boolean,
  nowMs: number,
): RoomSection {
  if (grace) return 'ending';
  if (room.activity_state === 'active') return 'now';
  if (room.starts_at && new Date(room.starts_at).getTime() > nowMs) return 'upcoming';
  return 'now';
}

/** Groups rows into the sections in ROOM_SECTIONS order, keeping each group's incoming order; empty ones drop. */
export function groupBySection<T>(rows: readonly T[], sectionOf: (row: T) => RoomSection): { section: RoomSection; rows: T[] }[] {
  return ROOM_SECTIONS.map((section) => ({ section, rows: rows.filter((r) => sectionOf(r) === section) })).filter(
    (g) => g.rows.length > 0,
  );
}
