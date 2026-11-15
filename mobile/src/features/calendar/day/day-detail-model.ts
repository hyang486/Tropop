/**
 * Calendar v2 day detail (§B): which rooms and events show on a day, their meta lines, the recap state and the
 * "Add next" prefill. Pure; reads RoomSnapshot only. startsAt/placeName/people arrive with the data contract and
 * are optional here, so older snapshots still render.
 */
import { en } from '../../../i18n/en';
import { addDays, isPastRoom, type DateKey } from '../calendar-plan';
import type { HeroTopic } from '../room-hero';

export type DayRoom = {
  roomId: string;
  name: string;
  start: DateKey;
  end: DateKey;
  endAt: string;
  diary?: string[] | null;
  hero?: HeroTopic;
  startsAt?: string | null;
  placeName?: string | null;
  people?: number | null;
};
export type DayEvent = { id: string; title: string; start: DateKey; end: DateKey; emoji: string; startTime?: string; endTime?: string };


/** Rooms covering `date`, by start instant (startsAt, else the start day); ties by name. */
export function dayRooms<T extends DayRoom>(rooms: Record<string, T>, date: DateKey): T[] {
  const at = (r: T) => (r.startsAt && Number.isFinite(Date.parse(r.startsAt)) ? Date.parse(r.startsAt) : Date.parse(`${r.start}T00:00:00Z`));
  return Object.values(rooms)
    .filter((r) => r.start <= date && r.end >= date)
    .sort((a, b) => at(a) - at(b) || a.name.localeCompare(b.name));
}

/** My events covering `date`: all-day first, then by start time. */
export function dayEvents<T extends DayEvent>(events: readonly T[], date: DateKey): T[] {
  return events
    .filter((e) => e.start <= date && e.end >= date)
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title));
}

/** "Wed, Nov 18" (nav title); `long` is "Wednesday, November 18" for the empty-day line. */
export function dayTitle(date: DateKey, long = false): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', long
    ? { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }
    : { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
}

const clock = (iso: string, tz?: string) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso));

const ymd = (ms: number, tz?: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(ms);
/** "Ends today at 10:00 PM" / "Ends tomorrow at ..." / "Ends Nov 18 at ..." (en.room.endsOn; no year). */
function endsLine(endAt: string, now: number, tz?: string): string {
  const end = Date.parse(endAt);
  const diff = Math.round((Date.parse(ymd(end, tz)) - Date.parse(ymd(now, tz))) / 86_400_000);
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: tz }).format(end);
  return en.room.endsOn(diff <= 0 ? 'today' : diff === 1 ? 'tomorrow' : 'later', date, clock(endAt, tz));
}

/** Hero meta: "7:30 AM – 8:30 AM · Park"; "Ended 9:40 PM" when there is no start; blank parts drop with their dot. */
export function roomTime(r: Pick<DayRoom, 'startsAt' | 'endAt'>, tz?: string, now?: number): string | null {
  const hasEnd = Number.isFinite(Date.parse(r.endAt));
  if (r.startsAt && Number.isFinite(Date.parse(r.startsAt))) return hasEnd ? `${clock(r.startsAt, tz)} – ${clock(r.endAt, tz)}` : clock(r.startsAt, tz);
  if (!hasEnd) return null;
  // "Ended" only once the end instant has passed; a still-live (multi-day) room says when it ends, relative to the
  // device's today (not the viewed day), with the chat header's string.
  if (now !== undefined && Date.parse(r.endAt) > now) return endsLine(r.endAt, now, tz);
  return en.calendar.endedAt(clock(r.endAt, tz));
}
/** Spoken form for the card label: "7:30 to 8:30 AM" is left to the screen reader, so keep the plain range. */
export function roomTimeSpoken(r: Pick<DayRoom, 'startsAt' | 'endAt'>, tz?: string, now?: number): string | null {
  return roomTime(r, tz, now)?.replace(' – ', ' to ') ?? null;
}
export function roomPlace(r: Pick<DayRoom, 'placeName'>): string | null {
  const p = r.placeName?.trim();
  return p ? p.slice(0, 120) : null;
}

/** A room is open until its end instant; an ended room is not a button. */
export const roomIsLive = (r: Pick<DayRoom, 'end' | 'endAt'>, now: number) => !isPastRoom(r, now);

export type RecapState = 'pending' | 'upsell' | 'failed' | 'ready' | 'wait';
/** plus === null while the flag is unread: wait instead of guessing the tier. */
export function recapState(r: Pick<DayRoom, 'end' | 'endAt' | 'diary'>, now: number, plus: boolean | null): RecapState {
  if (!isPastRoom(r, now)) return 'pending';
  if (plus === null) return 'wait';
  if (!plus) return 'upsell';
  return r.diary && r.diary.length > 0 ? 'ready' : 'failed';
}

/** "You met 3 people" / "You met 1 person"; null (hide the row) under 2 people or unknown. people counts you. */
/** The recap card read as one sentence; null for the upsell state, whose button must stay reachable on its own. */
export function recapSpoken(state: RecapState, people: number | null | undefined, diary: readonly string[] | null | undefined): string | null {
  const t = en.calendar;
  if (state === 'upsell' || state === 'wait') return null;
  const body = state === 'pending' ? [t.recapPending] : state === 'failed' ? [t.recapNone]
    : [metPeople(people), ...(diary ?? []).slice(0, 3).map((l) => l.trim())];
  return [t.recapTitle, ...body].filter(Boolean).map((p) => String(p).replace(/[.\s]+$/, '')).join('. ') + '.';
}

export function metPeople(people: number | null | undefined): string | null {
  if (typeof people !== 'number' || !Number.isFinite(people) || people < 2) return null;
  return en.calendar.metPeople(people - 1);
}

const NOUN: Record<HeroTopic, string | null> = {
  run: 'run', sports: 'game', study: 'study session', food: 'meetup', party: 'party',
  hike: 'hike', music: 'jam', travel: 'trip', general: null,
};
export const addNextLabel = (hero: HeroTopic | undefined): string => {
  return en.calendar.addNext(NOUN[hero ?? 'general']);
};

const hhmm = (iso: string, tz?: string): string | null => {
  if (!Number.isFinite(Date.parse(iso))) return null;
  const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(new Date(iso));
  return /^\d\d:\d\d$/.test(p) ? p : null;
};

/**
 * Editor params for "Add next": same weekday +7 days from the room's start day, the room's times (all day when the
 * start is unknown), nothing saved until the user saves. startTime/endTime are only set when both are known.
 */
export function addNextParams(r: DayRoom, emoji: string, tz?: string): Record<string, string> {
  const start = addDays(r.start, 7);
  const end = addDays(r.end, 7);
  const out: Record<string, string> = { title: r.name, start, end, emoji };
  const s = r.startsAt ? hhmm(r.startsAt, tz) : null;
  const e = hhmm(r.endAt, tz);
  if (s && e && !(start === end && e < s)) { out.startTime = s; out.endTime = e; }
  return out;
}

/** "7:00 – 9:00 PM" style row meta for my events; "All day" without times. */
export function eventTimeText(e: Pick<DayEvent, 'startTime' | 'endTime'>): string {
  if (!e.startTime || !e.endTime) return en.calendar.allDayLabel;
  const f = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  return `${f(e.startTime)} – ${f(e.endTime)}`;
}
