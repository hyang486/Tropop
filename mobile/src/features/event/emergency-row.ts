/**
 * P3 Emergency row (ux spec): while any member of a listed open room is in Emergency, the Rooms row says who
 * needs help, shows the Emergency start time and sorts first in its section. Pure (no imports), so node tests
 * can load it; the reads are in room-summary-api.ts and the copy in en.home.row.
 */
export type EmergencyPerson = { userId: string; name: string; startedAt: string };

export type EmergencyLine =
  | { kind: 'own' }
  | { kind: 'one'; name: string }
  | { kind: 'many'; name: string; more: number };

type Def = { id: string; room_id: string; is_emergency: boolean };
type Status = { room_id: string; user_id: string; status_id: string; updated_at?: string | null };
type Event = { room_id: string; user_id: string; created_at: string };
type Profile = { id: string; display_name: string | null };

const time = (iso: string) => new Date(iso).getTime();

/**
 * People in Emergency per room, newest first. A member counts while their current status is an Emergency
 * status of that room; the start time is their latest emergency_events row (else the status update time).
 */
export function buildRoomEmergencies(
  defs: readonly Def[],
  statuses: readonly Status[],
  events: readonly Event[],
  profiles: readonly Profile[],
  someone: string,
): Map<string, EmergencyPerson[]> {
  const emergencyDefs = new Set(defs.filter((d) => d.is_emergency).map((d) => `${d.room_id}:${d.id}`));
  const latest = new Map<string, string>();
  for (const e of events) {
    const key = `${e.room_id}:${e.user_id}`;
    const prev = latest.get(key);
    if (!prev || time(e.created_at) > time(prev)) latest.set(key, e.created_at);
  }
  const names = new Map(profiles.map((p) => [p.id, p.display_name?.trim() || someone]));
  const out = new Map<string, EmergencyPerson[]>();
  for (const s of statuses) {
    if (!emergencyDefs.has(`${s.room_id}:${s.status_id}`)) continue;
    const startedAt = latest.get(`${s.room_id}:${s.user_id}`) ?? s.updated_at ?? null;
    if (!startedAt) continue;
    const list = out.get(s.room_id) ?? [];
    list.push({ userId: s.user_id, name: names.get(s.user_id) ?? someone, startedAt });
    out.set(s.room_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => time(b.startedAt) - time(a.startedAt));
  return out;
}

/**
 * Who line 2 names. Alone and me: "You asked for help". Otherwise the newest other person, and "N more"
 * counts everyone else in Emergency, me included (ux, 2026-11-14).
 */
export function emergencyLine(people: readonly EmergencyPerson[] | undefined, myId: string | undefined): EmergencyLine | null {
  if (!people || people.length === 0) return null;
  const others = people.filter((p) => p.userId !== myId);
  if (others.length === 0) return { kind: 'own' };
  const more = people.length - 1;
  return more === 0 ? { kind: 'one', name: others[0].name } : { kind: 'many', name: others[0].name, more };
}

/** The newest Emergency start in the room (the row's time), or null when none is open. */
export function emergencyStartedAt(people: readonly EmergencyPerson[] | undefined): string | null {
  if (!people || people.length === 0) return null;
  return people.reduce((a, p) => (time(p.startedAt) > time(a) ? p.startedAt : a), people[0].startedAt);
}

/** Rows with an open Emergency first (newest start first); the rest keep their order. */
export function sortEmergencyFirst<T>(rows: readonly T[], startedAtOf: (row: T) => string | null): T[] {
  const withEm = rows.map((row, i) => ({ row, i, at: startedAtOf(row) }));
  return withEm
    .sort((a, b) => {
      if (a.at && b.at) return time(b.at) - time(a.at) || a.i - b.i;
      if (a.at) return -1;
      if (b.at) return 1;
      return a.i - b.i;
    })
    .map((x) => x.row);
}
