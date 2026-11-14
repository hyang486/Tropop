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

/** 'none' is "No limit", which means the plan maximum. */
export type Capacity = number | 'none';

export function capacityValue(capacity: Capacity, plus: boolean | null) {
  const max = capacityMax(plus);
  if (capacity === 'none') return max;
  return Math.min(max, Math.max(MIN_MEMBERS, Math.round(capacity)));
}

/** The stepper's next value, kept inside 2 … plan max. Stepping from "No limit" starts at the plan max. */
export function stepCapacity(capacity: Capacity, delta: 1 | -1, plus: boolean | null): number {
  return capacityValue(capacityValue(capacity, plus) + delta, plus);
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
export function openRowSpoken(iconLabel: string, name: string, area: string | null) {
  return [iconLabel, name, area].filter(Boolean).join(', ');
}

export type Visibility = 'private' | 'public';

/** Why a public room can't be created yet; null when it can. Private rooms have nothing to check. */
export function openRoomProblem(visibility: Visibility, area: string): 'area' | null {
  return visibility === 'public' && !normalizeArea(area) ? 'area' : null;
}

/**
 * The Spec 11 create_room arguments (0031), passed by name. Private rooms must not send an icon or location.
 * "No limit" sends the plan maximum with p_no_limit so the server still enforces a real cap.
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
    p_no_limit: input.capacity === 'none',
    p_visibility: input.visibility,
  };
  if (input.visibility === 'private') return base;
  return { ...base, p_public_icon: input.icon, p_public_location: normalizeArea(input.area) };
}

/**
 * Migration 0031 (capacity and public rooms) is live (20261114054841). While false, Create room hides the B/D
 * controls and calls the pre-0031 create_room; kept as a switch to turn B/D off again.
 */
export const OPEN_ROOMS_LIVE = true;

/**
 * join_open_room's result: the room id, or null when the room went private, was deleted or expired between the list
 * read and the tap (0031 returns null without an error then). Anything that is not a non-empty string counts as gone.
 */
export function joinedRoomId(data: unknown): string | null {
  return typeof data === 'string' && data ? data : null;
}
