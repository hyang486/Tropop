// UX3-A01 (audit-3 batch 3, S1): what a Rooms row says. Pure (type imports only), so tests can load it; callers
// pass the copy (`en`) and the chat-line parser.
import type { en } from "@/i18n/en";
import type { chatLine as ChatLineFn } from "@/lib/chat-line";

type Copy = typeof en;

/** One row of room_list_summaries (0037). last_* are null for a room with no chat item yet. */
export type RoomSummary = {
  room_id: string;
  last_kind: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  last_sender_name: string | null;
  last_at: string | null;
  unread: number;
};

/**
 * Line 2: the last item. Text "Jun: Running 5 min late" ("You: …" for mine), media "Jun shared 3 photos",
 * arrival "Sora arrived", Emergency "Sora set Emergency" (the only danger-colored case), else "No messages yet".
 */
export function lastItemLine(
  s: RoomSummary | undefined,
  uid: string | undefined,
  en: Copy,
  chatLine: typeof ChatLineFn,
  /** B3: "{who} sent a sticker: {caption}" (injected so this file stays import-free); the raw art id is never shown. */
  stickerLine: (who: string, stickerId: string) => string = (who) => `${who} sent a sticker`,
): { text: string; danger: boolean } {
  if (!s?.last_at || !s.last_kind)
    return { text: en.home.row.noMessages, danger: false };
  const mine = !!uid && s.last_sender_id === uid;
  const who = mine ? en.chat.you : s.last_sender_name || en.rooms.someone;
  const body = s.last_body ?? "";
  if (s.last_kind === "text")
    return { text: `${who}: ${oneLine(body)}`, danger: false };
  // B3: a sticker row says "Jun sent a sticker: Good idea!", never the raw art id.
  if (s.last_kind === "sticker") return { text: oneLine(stickerLine(who, body)), danger: false };
  if (s.last_kind === "media")
    return {
      text: en.chat.shared(who, body || en.chat.sharedFallback),
      danger: false,
    };
  const line = chatLine(s.last_kind, body);
  if (line.kind === "emergency")
    return { text: en.chat.emergencySet(line.name), danger: true };
  if (line.kind === "activityStarted")
    return { text: en.chat.activityStarted, danger: false };
  return { text: oneLine(line.text), danger: s.last_kind === "emergency" };
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar days from a's day to b's day (local time; DST-safe by rounding). */
function dayDiff(aMs: number, bMs: number): number {
  return Math.round((startOfDay(bMs) - startOfDay(aMs)) / 86_400_000);
}

function clock(d: Date): string {
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Trailing time: "9:38" today, "Yesterday", a weekday ("Fri") within the week, then "Nov 2". */
export function rowTimeLabel(
  iso: string | null,
  nowMs: number,
  en: Copy,
): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  const days = dayDiff(at.getTime(), nowMs);
  if (days <= 0) return clock(at);
  if (days === 1) return en.home.row.yesterday;
  if (days < 7) return WEEKDAYS[at.getDay()];
  return `${MONTHS[at.getMonth()]} ${at.getDate()}`;
}

/** The unread pill's text; null hides it (0). Capped at "99+". */
export function unreadLabel(unread: number | undefined): string | null {
  if (!unread || unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}

/**
 * Live: an activity is running, or the room has a start time and now is between it and the end. No start time
 * and no activity is not Live (creation time does not count).
 */
export function isLive(
  room: {
    activity_state: string;
    starts_at: string | null;
    expires_at: string;
  },
  nowMs: number,
): boolean {
  if (room.activity_state === "active") return true;
  if (!room.starts_at) return false;
  return (
    new Date(room.starts_at).getTime() <= nowMs &&
    nowMs < new Date(room.expires_at).getTime()
  );
}

/**
 * Row line 3, one line: before the start "Starts Sat 7:00 AM · Golden Gate" (the place only here, last, so it is
 * what gets cut); otherwise "Public · 5 people · ends in 5h 27m" ("Public" only for public rooms, UX2-58).
 */
export function rowMetaLine(
  room: {
    starts_at: string | null;
    expires_at: string;
    place_name?: string | null;
    visibility?: string | null;
    member_count: number | null;
  },
  nowMs: number,
  en: Copy,
  remaining: (ms: number) => string,
): string {
  const starts = startsLabel(room.starts_at, nowMs, en);
  const place = room.place_name?.trim();
  if (starts) return place ? `${starts} · ${place}` : starts;
  return [
    room.visibility === "public" ? en.createRoom.public : null,
    room.member_count !== null ? en.room.people(room.member_count) : null,
    en.home.row.endsIn(remaining(new Date(room.expires_at).getTime() - nowMs)),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "Starts Sat 7:00 AM" within the week, "Starts Nov 20 7:00 AM" further out; null once started. */
export function startsLabel(
  startsAt: string | null,
  nowMs: number,
  en: Copy,
): string | null {
  if (!startsAt) return null;
  const at = new Date(startsAt);
  if (at.getTime() <= nowMs) return null;
  const day =
    dayDiff(nowMs, at.getTime()) < 7
      ? WEEKDAYS[at.getDay()]
      : `${MONTHS[at.getMonth()]} ${at.getDate()}`;
  return en.home.row.starts(
    `${day} ${clock(at)} ${at.getHours() < 12 ? "AM" : "PM"}`,
  );
}

/** Sorts rows newest last item first; rooms with no item keep their incoming order after them. */
export function sortByLastItem<T>(
  rows: readonly T[],
  lastAtOf: (row: T) => string | null | undefined,
): T[] {
  const at = (row: T) => {
    const v = lastAtOf(row);
    return v ? new Date(v).getTime() : -Infinity;
  };
  return rows
    .map((row, i) => ({ row, i, t: at(row) }))
    .sort((a, b) => (b.t === a.t ? a.i - b.i : b.t - a.t))
    .map((x) => x.row);
}

/** VoiceOver, one element: "Saturday Lake Loop, live, 3 unread, Jun: Running 5 min late, ends in 5h 27m". */
export function rowAccessibilityLabel(
  en: Copy,
  parts: {
    name: string;
    live: boolean;
    unread: number | undefined;
    line: string | null;
    meta: string;
  },
): string {
  return [
    parts.name,
    parts.live ? en.home.row.liveSpoken : null,
    parts.unread ? en.home.row.unreadSpoken(parts.unread) : null,
    parts.line,
    parts.meta.replace(/ · /g, ", "),
  ]
    .filter(Boolean)
    .join(", ");
}
