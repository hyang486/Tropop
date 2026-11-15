/**
 * Trok Calendar data on the phone only (human: "폰에만 저장"). One versioned AsyncStorage key per user holds
 * room snapshots and personal events; the Plus preview flag has its own key. Pure: storage is passed in.
 */
import { type CalItem, type DateKey, daysBetween, isDateKey, roomRange } from './calendar-plan';

export const CALENDAR_VERSION = 1;
export const calendarKey = (uid: string) => `qrew.calendar.v${CALENDAR_VERSION}.${uid}`;
export const plusPreviewKey = (uid: string) => `qrew.plusPreview.v1.${uid}`;

export const EVENT_TITLE_MAX = 60;
export const EVENT_SPAN_MAX = 366;
export const DIARY_LINES = 3;

export type RoomSnapshot = {
  roomId: string;
  name: string;
  type: string;
  start: DateKey;
  end: DateKey;
  /** The end instant (ISO); past rooms open the diary card. */
  endAt: string;
  emoji: string;
  /** First-person recap lines, saved once the recap arrives; null when generation failed. */
  diary?: string[] | null;
};

/** UX3-A13: local 24 h "HH:MM". An event has both times or none (none = all day). */
export type TimeKey = string;
const TIME_KEY = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isTimeKey(v: unknown): v is TimeKey {
  return typeof v === 'string' && TIME_KEY.test(v);
}

type EventTimes = { startTime?: TimeKey; endTime?: TimeKey };
export type PersonalEvent = { id: string; title: string; start: DateKey; end: DateKey; emoji: string } & EventTimes;

/** Both times valid and not ending before they start on a one-day event; otherwise none. */
function timePair(start: DateKey, end: DateKey, startTime: unknown, endTime: unknown): EventTimes {
  if (!isTimeKey(startTime) || !isTimeKey(endTime)) return {};
  if (start === end && endTime < startTime) return {};
  return { startTime, endTime };
}

export type CalendarDoc = { version: 1; rooms: Record<string, RoomSnapshot>; events: PersonalEvent[] };

export const emptyDoc = (): CalendarDoc => ({ version: 1, rooms: {}, events: [] });

/** Emoji before the AI picks one (recap), by room type. */
export function defaultEmoji(type: string): string {
  const byType: Record<string, string> = { sports: '🏃', event: '🎉', waiting: '⏳', general: '💬' };
  return Object.hasOwn(byType, type) ? byType[type] : '📌'; // own keys only: 'constructor' etc. fall back
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function parseRoom(v: unknown): RoomSnapshot | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const roomId = str(r.roomId, 64);
  const name = str(r.name, 120);
  const emoji = str(r.emoji, 16);
  if (!roomId || !name || !emoji || !isDateKey(r.start) || !isDateKey(r.end) || typeof r.endAt !== 'string') return null;
  const diary = Array.isArray(r.diary) ? cleanDiary(r.diary) : r.diary === null ? null : undefined;
  return { roomId, name, type: typeof r.type === 'string' ? r.type : 'general', start: r.start, end: r.end, endAt: r.endAt, emoji, diary };
}

function parseEvent(v: unknown): PersonalEvent | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  const id = str(e.id, 64);
  const title = str(e.title, EVENT_TITLE_MAX);
  const emoji = str(e.emoji, 16);
  if (!id || !title || !emoji || !isDateKey(e.start) || !isDateKey(e.end) || e.end < e.start) return null;
  return { id, title, start: e.start, end: e.end, emoji, ...timePair(e.start, e.end, e.startTime, e.endTime) };
}

/** A stored value back into a doc; anything unreadable or of another version starts empty. */
export function parseDoc(raw: string | null): CalendarDoc {
  if (!raw) return emptyDoc();
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (v?.version !== CALENDAR_VERSION) return emptyDoc();
    const doc = emptyDoc();
    for (const r of Object.values((v.rooms as Record<string, unknown>) ?? {})) {
      const p = parseRoom(r);
      if (p) doc.rooms[p.roomId] = p;
    }
    for (const e of Array.isArray(v.events) ? v.events : []) {
      const p = parseEvent(e);
      if (p) doc.events.push(p);
    }
    return doc;
  } catch {
    return emptyDoc();
  }
}

export function cleanDiary(lines: unknown[]): string[] {
  return lines
    .filter((l): l is string => typeof l === 'string' && l.trim() !== '')
    .slice(0, DIARY_LINES)
    .map((l) => l.trim().slice(0, 90));
}

type RoomLike = {
  id: string;
  name: string;
  type: string;
  starts_at: string | null;
  created_at: string;
  expires_at: string;
  deleted_at?: string | null;
};

/** Snapshot every listed room (current and future, plus grace); keeps an emoji and diary already saved. */
export function mergeRooms(doc: CalendarDoc, rooms: readonly RoomLike[], timeZone?: string): CalendarDoc {
  const next: CalendarDoc = { ...doc, rooms: { ...doc.rooms } };
  for (const room of rooms) {
    const { start, end } = roomRange(room, timeZone);
    const prev = doc.rooms[room.id];
    const endAt =
      room.deleted_at && Date.parse(room.deleted_at) < Date.parse(room.expires_at) ? room.deleted_at : room.expires_at;
    next.rooms[room.id] = {
      roomId: room.id,
      name: room.name,
      type: room.type,
      start,
      end,
      endAt,
      emoji: prev?.emoji ?? defaultEmoji(room.type),
      diary: prev?.diary,
    };
  }
  return next;
}

/** The recap's emoji and diary (developer's diary:true extension). A room never snapshotted gets one from `room`. */
export function applyRecap(
  doc: CalendarDoc,
  roomId: string,
  recap: { emoji?: unknown; diary?: unknown },
  room?: RoomLike,
  timeZone?: string,
): CalendarDoc {
  const base = doc.rooms[roomId] ? doc : room ? mergeRooms(doc, [room], timeZone) : null;
  if (!base) return doc;
  const prev = base.rooms[roomId];
  const good = Array.isArray(recap.diary) && cleanDiary(recap.diary).length > 0;
  // Past the server's diary cap (or a failed diary) the body has diary null and the type's fallback emoji, so a
  // saved good diary and its emoji are kept; null only marks "no diary yet" and is asked again next time.
  if (!good && Array.isArray(prev.diary) && prev.diary.length > 0) return base;
  const emoji = str(recap.emoji, 16) ?? prev.emoji;
  const diary = good ? cleanDiary(recap.diary as unknown[]) : null;
  return { ...base, rooms: { ...base.rooms, [roomId]: { ...prev, emoji, diary } } };
}

export type EventInput = { title: string; start: DateKey; end: DateKey; emoji: string } & EventTimes;
export type EventProblem = 'title' | 'dates' | 'order' | 'span' | 'emoji';

export function checkEvent(e: EventInput): EventProblem | null {
  if (!e.title.trim()) return 'title';
  if (!isDateKey(e.start) || !isDateKey(e.end)) return 'dates';
  if (e.end < e.start) return 'order';
  if (e.startTime !== undefined || e.endTime !== undefined) {
    if (!isTimeKey(e.startTime) || !isTimeKey(e.endTime)) return 'dates';
    if (e.start === e.end && e.endTime < e.startTime) return 'order';
  }
  if (daysBetween(e.start, e.end) > EVENT_SPAN_MAX) return 'span';
  if (!e.emoji.trim()) return 'emoji';
  return null;
}

export function upsertEvent(doc: CalendarDoc, id: string, e: EventInput): CalendarDoc {
  const ev: PersonalEvent = {
    id,
    title: e.title.trim().slice(0, EVENT_TITLE_MAX),
    start: e.start,
    end: e.end,
    emoji: e.emoji.trim(),
    ...timePair(e.start, e.end, e.startTime, e.endTime),
  };
  const exists = doc.events.some((x) => x.id === id);
  return { ...doc, events: exists ? doc.events.map((x) => (x.id === id ? ev : x)) : [...doc.events, ev] };
}

export function deleteEvent(doc: CalendarDoc, id: string): CalendarDoc {
  return { ...doc, events: doc.events.filter((x) => x.id !== id) };
}

/** Everything the grid draws. Room ids and event ids live in separate namespaces. */
export function calendarItems(doc: CalendarDoc): CalItem[] {
  return [
    ...Object.values(doc.rooms).map((r) => ({ id: `room:${r.roomId}`, kind: 'room' as const, title: r.name, start: r.start, end: r.end, emoji: r.emoji })),
    ...doc.events.map((e) => ({ id: `event:${e.id}`, kind: 'event' as const, title: e.title, start: e.start, end: e.end, emoji: e.emoji })),
  ];
}

/**
 * A queued write for `uid` runs only while that user is signed in: after SIGNED_OUT cleared the keys, a late
 * recap or rooms sync must not write them back. Before the first auth event (`authKnown` false) writes pass.
 */
export function mayWrite(uid: string, currentUid: string | null, authKnown: boolean): boolean {
  return !authKnown || uid === currentUid;
}

// Before 0032 is live public.user_plans / set_my_plan do not exist: the local copy stays the plan, with no error.
const PLAN_MISSING = new Set(['42P01', 'PGRST205', '42883', 'PGRST202']);

function errCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

/** True when the error only says the 0032 plan table or RPC is not there yet. */
export function planMissing(error: unknown): boolean {
  const code = errCode(error);
  return code !== undefined && PLAN_MISSING.has(code);
}

/**
 * The user_plans read (select plan ... maybeSingle) → the Plus flag, or null to keep the local cache
 * (0032 missing, offline or any read error). No row means free.
 */
export function planFromRead(res: { data: { plan?: unknown } | null; error: unknown }): boolean | null {
  if (res.error) return null;
  return res.data?.plan === 'plus';
}

/**
 * set_my_plan result → what the switch does: 'saved' (server has it), 'local' (0032 missing: keep the local
 * copy, no error) or 'revert' (any other failure: flip back and show the error).
 */
export function planSaveOutcome(error: unknown): 'saved' | 'local' | 'revert' {
  if (!error) return 'saved';
  return planMissing(error) ? 'local' : 'revert';
}

/** Sign-out and account deletion: both of the user's keys go. */
export async function clearUserCalendar(storage: { multiRemove(keys: string[]): Promise<void> }, uid: string) {
  await storage.multiRemove([calendarKey(uid), plusPreviewKey(uid)]);
}

/** qrewing calendar_add 200 body → an event input, or null when the shape is off. */
export function parseCalendarAdd(data: unknown): EventInput | null {
  const ev = (data as { event?: Record<string, unknown> } | null)?.event;
  if (!ev) return null;
  const input = {
    title: typeof ev.title === 'string' ? ev.title.trim().slice(0, EVENT_TITLE_MAX) : '',
    start: ev.start as string,
    end: ev.end as string,
    emoji: typeof ev.emoji === 'string' ? ev.emoji : '',
  };
  return checkEvent(input) ? null : input;
}

/** Calendar tiers (human FINAL 2026-11-13 PM): Free and Plus both get the calendar; only signing in is required. */
export function calendarGate(signedIn: boolean): 'signedOut' | 'calendar' {
  return signedIn ? 'calendar' : 'signedOut';
}

/**
 * C14 / sweep 1: what the event editor shows. With an id it waits for the doc (never a blank form that would save a
 * copy), then edits the event or says it is gone; with no id it adds a new one. `kept` is the event this editor
 * already opened: it stays while a delete (or a failed delete) takes it out of the doc.
 */
export type EditorTarget = { kind: 'loading' } | { kind: 'missing' } | { kind: 'edit'; event: PersonalEvent } | { kind: 'new' };

export function editorTarget(
  id: string | undefined,
  doc: CalendarDoc | null,
  kept?: PersonalEvent | null,
  signedIn = true,
): EditorTarget {
  if (!id) return { kind: 'new' };
  // No user: the doc never loads, so a known id can't be shown; say it's gone instead of spinning forever.
  if (!signedIn) return { kind: 'missing' };
  const event = doc?.events.find((e) => e.id === id) ?? (kept?.id === id ? kept : undefined);
  if (event) return { kind: 'edit', event };
  return doc ? { kind: 'missing' } : { kind: 'loading' };
}

/**
 * Sweep 2: a request whose answer counts only while the sheet that sent it is still open. `start` before sending,
 * `cancel` on close; `isCurrent(id)` is false once the sheet closed or a newer request started.
 */
export function createRequestGate() {
  let seq = 0;
  let live: number | null = null;
  return {
    start: () => (live = ++seq),
    cancel: () => {
      live = null;
    },
    isCurrent: (id: number) => live === id,
  };
}
