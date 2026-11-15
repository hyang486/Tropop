/**
 * Moments home (calendar-v2-spec §A), pure: the week summary counts, the day strip rows and cell marks, and the
 * Past / Upcoming rows. Counted on the phone from the calendar doc; no model call.
 */
import type { CalendarDoc, PersonalEvent, RoomSnapshot } from './calendar-data';
import { addDays, type DateKey, daysInMonth, isPastRoom, keyOf } from './calendar-plan';

const DAY_MS = 86_400_000;

function localAt(key: DateKey, time?: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const [h, mi] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(y, m - 1, d, h, mi).getTime();
}

/** Sunday of the local week that holds `key`. */
export function weekStart(key: DateKey): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  return addDays(key, -new Date(y, m - 1, d).getDay());
}

export type HomeItem = {
  kind: 'room' | 'event';
  id: string; // 'room:<id>' | 'event:<id>' (calendarItems ids)
  title: string;
  emoji: string;
  start: DateKey;
  end: DateKey;
  startMs: number;
  ended: boolean;
  people: number | null;
};

function roomItem(r: RoomSnapshot, now: number): HomeItem {
  const at = r.startsAt ? Date.parse(r.startsAt) : NaN;
  return {
    kind: 'room', id: `room:${r.roomId}`, title: r.name, emoji: r.emoji, start: r.start, end: r.end,
    startMs: Number.isFinite(at) ? at : localAt(r.start), ended: isPastRoom(r, now), people: r.people ?? null,
  };
}

function eventItem(e: PersonalEvent, now: number): HomeItem {
  const endMs = e.endTime ? localAt(e.end, e.endTime) : localAt(addDays(e.end, 1));
  return {
    kind: 'event', id: `event:${e.id}`, title: e.title, emoji: e.emoji, start: e.start, end: e.end,
    startMs: localAt(e.start, e.startTime), ended: endMs <= now, people: null,
  };
}

export function homeItems(doc: CalendarDoc, now: number): HomeItem[] {
  return [...Object.values(doc.rooms).map((r) => roomItem(r, now)), ...doc.events.map((e) => eventItem(e, now))];
}

const touches = (it: HomeItem, from: DateKey, to: DateKey) => it.start <= to && it.end >= from;
const comingWithin = (it: HomeItem, now: number, days: number) => it.startMs > now && it.startMs <= now + days * DAY_MS;

export type WeekSummary = { rooms: number; newPeople: number | null; comingUp: number };

/** §A3: rooms = rooms + my events that touch this Sun–Sat week; new people = Σ(people − 1) over the week's rooms with a
 * known count (null when none is known); coming up = items that start after now and within 7 days. */
export function weekSummary(items: readonly HomeItem[], today: DateKey, now: number): WeekSummary {
  const from = weekStart(today);
  const to = addDays(from, 6);
  const week = items.filter((it) => touches(it, from, to));
  const known = week.filter((it) => it.kind === 'room' && it.people != null);
  return {
    rooms: week.length,
    newPeople: known.length ? known.reduce((n, it) => n + Math.max(0, it.people! - 1), 0) : null,
    comingUp: items.filter((it) => comingWithin(it, now, 7)).length,
  };
}

/** "A.", "A and B.", "A, B, and C." */
export function joinParts<T>(parts: readonly T[], text: (p: T) => string[]): string[][] {
  return parts.map((p, i) => {
    const sep = i === 0 ? '' : parts.length === 2 ? ' and ' : i === parts.length - 1 ? ', and ' : ', ';
    const [em, rest] = text(p);
    return [sep, em, rest + (i === parts.length - 1 ? '.' : '')];
  });
}

/** The non-zero parts of the summary, in order (empty → the summaryEmpty line). */
export function summaryParts(s: WeekSummary): { kind: 'rooms' | 'people' | 'coming'; n: number }[] {
  const out: { kind: 'rooms' | 'people' | 'coming'; n: number }[] = [];
  if (s.rooms > 0) out.push({ kind: 'rooms', n: s.rooms });
  if (s.newPeople) out.push({ kind: 'people', n: s.newPeople });
  if (s.comingUp > 0) out.push({ kind: 'coming', n: s.comingUp });
  return out;
}

/** §A5: collapsed = this week + next week; expanded = the shown month's weeks (Sun first, 5–6 rows). */
export function stripRows(today: DateKey, expanded: boolean, year: number, month0: number): DateKey[][] {
  let first: DateKey;
  let rows: number;
  if (!expanded) {
    first = weekStart(today);
    rows = 2;
  } else {
    const day1 = keyOf(year, month0, 1);
    first = weekStart(day1);
    const last = keyOf(year, month0, daysInMonth(year, month0));
    rows = Math.round((localAt(weekStart(last)) - localAt(first)) / (7 * DAY_MS)) + 1;
  }
  return Array.from({ length: rows }, (_, r) => Array.from({ length: 7 }, (_, c) => addDays(first, r * 7 + c)));
}

export type DayMark = { rooms: number; events: number };

export function dayMarks(items: readonly HomeItem[], keys: readonly DateKey[]): Map<DateKey, DayMark> {
  const out = new Map<DateKey, DayMark>();
  for (const k of keys) {
    let rooms = 0;
    let events = 0;
    for (const it of items) {
      if (it.start > k || it.end < k) continue;
      if (it.kind === 'room') rooms++;
      else events++;
    }
    out.set(k, { rooms, events });
  }
  return out;
}

/** §A5 dimming: outside the shown month (expanded) or before this week. */
export function dimmed(key: DateKey, today: DateKey, expanded: boolean, year: number, month0: number): boolean {
  if (key < weekStart(today)) return true;
  return expanded && key.slice(0, 7) !== keyOf(year, month0, 1).slice(0, 7);
}

export type RowSummary = { rooms: number; events: number; people: number | null; items: HomeItem[] };

function rowSummary(list: HomeItem[]): RowSummary {
  const rooms = list.filter((it) => it.kind === 'room');
  const known = rooms.filter((it) => it.people != null);
  return {
    rooms: rooms.length,
    events: list.length - rooms.length,
    people: known.length ? known.reduce((n, it) => n + Math.max(0, it.people! - 1), 0) : null,
    items: list,
  };
}

/** §A6 Past: items that ended, with an end day in this month; newest (latest end) first. */
export function pastRow(items: readonly HomeItem[], today: DateKey): RowSummary {
  const month = today.slice(0, 7);
  return rowSummary(
    items.filter((it) => it.ended && it.end.slice(0, 7) === month).sort((a, b) => (a.end < b.end ? 1 : a.end > b.end ? -1 : b.startMs - a.startMs)),
  );
}

/** §A6 Upcoming: items that start in the next 30 days; soonest first. */
export function upcomingRow(items: readonly HomeItem[], now: number): RowSummary {
  return rowSummary(items.filter((it) => comingWithin(it, now, 30)).sort((a, b) => a.startMs - b.startMs));
}
