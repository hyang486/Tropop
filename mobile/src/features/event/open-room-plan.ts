// Pure rules for Create room capacity (Spec 11 B) and public Open chat rooms (Spec 11 D). No React Native imports.
// The server enforces capacity at join time and the 5-per-day public limit; these only shape what the host picks.

import type { InkIconKey } from '@/components/calendar/ink-icon-map';

export const FREE_MAX_MEMBERS = 6;
export const PLUS_MAX_MEMBERS = 30;
/** The host plus at least one guest. */
export const MIN_MEMBERS = 2;
/** Public rooms one person may create per day (server enforced; the client only words the error). */
export const PUBLIC_DAILY_LIMIT = 5;
/** public_location is 1..60 characters on the server. */
export const MAX_AREA = 60;

/** A Plus flag that is still loading (null) counts as Free. */
export function capacityMax(plus: boolean | null) {
  return plus ? PLUS_MAX_MEMBERS : FREE_MAX_MEMBERS;
}

/** 'none' is a value the host has not changed yet: it shows and sends the plan maximum (UX P1-10, no "No limit"). */
export type Capacity = number | 'none';

export function capacityValue(capacity: Capacity, plus: boolean | null) {
  const max = capacityMax(plus);
  if (capacity === 'none') return max;
  return Math.min(max, Math.max(MIN_MEMBERS, Math.round(capacity)));
}

/** The stepper's next value, 2 … plan max; at either end the value stays. */
export function stepCapacity(capacity: Capacity, delta: 1 | -1, plus: boolean | null): number {
  return capacityValue(capacityValue(capacity, plus) + delta, plus);
}

/** Which stepper ends are reached: − is off at 2, + at the plan max. */
export function capacityEnds(capacity: Capacity, plus: boolean | null) {
  const n = capacityValue(capacity, plus);
  return { atMin: n <= MIN_MEMBERS, atMax: n >= capacityMax(plus) };
}

/**
 * Capacity option B (HUMAN FINAL 2026-11-14): what + does. A Free host at 6 gets the Plus page instead of a dead
 * button; a Plus host at 30 (or an unread plan at the Free max) is simply at the end.
 */
export function capacityPlusTap(capacity: Capacity, plus: boolean | null): 'step' | 'upgrade' | 'off' {
  if (!capacityEnds(capacity, plus).atMax) return 'step';
  return plus === false ? 'upgrade' : 'off';
}

/** A typed people count, clamped to 2 … plan max; null when it is not a whole number (the value stays). */
export function typedCapacity(text: string, plus: boolean | null): number | null {
  const t = text.trim();
  if (!/^\d{1,4}$/.test(t)) return null;
  return capacityValue(Number(t), plus);
}

/**
 * 0032: create_room and update_room_expiry raise PT402 'plan_limit' when a Free host asks past 6 people or 2 days.
 * That opens the Plus screen, not an error line. 22023 (outside every plan) stays a plain error.
 */
export function isPlanLimit(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'PT402' && message === 'plan_limit';
}

/** The ink icons a host can pick for a public room. public_icon stores the key (a slug); the emoji only draws it. */
export const ROOM_ICONS: readonly { key: InkIconKey; emoji: string }[] = [
  { key: 'run', emoji: '🏃' },
  { key: 'bike', emoji: '🚴' },
  { key: 'ball', emoji: '⚽' },
  { key: 'coffee', emoji: '☕' },
  { key: 'meal', emoji: '🍽' },
  { key: 'party', emoji: '🎉' },
  { key: 'music', emoji: '🎵' },
  { key: 'book', emoji: '📚' },
  { key: 'work', emoji: '💼' },
  { key: 'beach', emoji: '🏖' },
  { key: 'chat', emoji: '💬' },
  { key: 'pin', emoji: '📍' },
];

/** The default icon per room type, so a public room never goes out without one. */
export function defaultRoomIcon(type: string): InkIconKey {
  if (type === 'sports') return 'run';
  if (type === 'event') return 'party';
  if (type === 'waiting') return 'book';
  return 'chat';
}

/** The emoji that draws a stored public_icon; unknown keys draw the pin. */
export function iconEmoji(key: string | null | undefined): string {
  return ROOM_ICONS.find((i) => i.key === key)?.emoji ?? '📍';
}

/** Trimmed area with inner whitespace collapsed; null when empty. */
export function normalizeArea(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, MAX_AREA);
  return t ? t : null;
}

/** One Open chat row, as VoiceOver reads it: "Run, Saturday Lake Loop, Los Angeles DTLA". */
export function openRowSpoken(name: string, area: string | null) {
  // UX2-42: the row has a title, so the icon is decorative and not read (it was the slug, "run").
  return [name, area].filter(Boolean).join(', ');
}

/**
 * UX P1-6: the time on an Open chat row. The start time when the room has one (list_open_rooms does not return it
 * yet), otherwise the end time. `day` is 'today' or 'tomorrow' in local time, else null (the caller shows a weekday).
 */
export function openRowWhen(room: { starts_at?: string | null; expires_at: string }, now: Date) {
  const kind: 'starts' | 'until' = room.starts_at ? 'starts' : 'until';
  const at = new Date(room.starts_at ?? room.expires_at);
  const dayIndex = (d: Date) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
  const diff = dayIndex(at) - dayIndex(now);
  const day: 'today' | 'tomorrow' | null = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : null;
  return { kind, at, day };
}

/** UX P1-6 + UX2-58: Open chat lists only rooms you can still join; a joined room shows once, in Your rooms. */
export function joinableOpenRooms<T extends { member_count: number; max_members: number; already_member: boolean }>(
  rows: readonly T[],
): T[] {
  return rows.filter((r) => !r.already_member && r.member_count < r.max_members);
}

export type Visibility = 'private' | 'public';

/** Why a public room can't be created yet; null when it can. Private rooms have nothing to check. */
export function openRoomProblem(visibility: Visibility, area: string): 'area' | null {
  return visibility === 'public' && !normalizeArea(area) ? 'area' : null;
}

/**
 * The Spec 11 create_room arguments (0031), passed by name. Private rooms must not send an icon or location.
 * An unchanged capacity sends the plan maximum. p_no_limit is no longer sent (server default false).
 */
export function openRoomArgs(input: {
  capacity: Capacity;
  plus: boolean | null;
  visibility: Visibility;
  icon: string;
  area: string;
}) {
  const base = {
    p_max_members: capacityValue(input.capacity, input.plus),
    p_visibility: input.visibility,
  };
  if (input.visibility === 'private') return base;
  return { ...base, p_public_icon: input.icon, p_public_location: normalizeArea(input.area) };
}

/**
 * Migration 0031 (capacity and public rooms) is live (20261114054841). While false, Create room hides the B/D
 * controls and calls the pre-0031 create_room; kept as a switch to turn B/D off again.
 */
/**
 * BUG-OC1: Open chat re-reads when the app returns to the foreground (a focus event never fires then), so a room
 * opened on another phone while this one sat on Rooms shows up without a relaunch.
 */
export function cameToForeground(prev: string, next: string): boolean {
  return prev !== 'active' && next === 'active';
}

export const OPEN_ROOMS_LIVE = true;

/**
 * join_open_room's result: the room id, or null when the room went private, was deleted or expired between the list
 * read and the tap (0031 returns null without an error then). Anything that is not a non-empty string counts as gone.
 */
export function joinedRoomId(data: unknown): string | null {
  return typeof data === 'string' && data ? data : null;
}
