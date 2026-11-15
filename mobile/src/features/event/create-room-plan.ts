// Pure rules for the Create room Start ⋮ End block (Spec 11 A5, A7). No React Native imports, so `npm test` runs it.
// End is when the room closes and everything in it is deleted (human confirmed). Free rooms last at most 2 days,
// Plus rooms 7 days (create_room accepts 5 minutes to 7 days).

const HOUR = 3_600_000;

export const FREE_MAX_HOURS = 48;
export const PLUS_MAX_HOURS = 168;
/** One line of quick presets for End: 3 hours, 1 day, 2 days, then "More". */
export const QUICK_PRESETS = [3, 24, 48] as const;
/** Plus only, behind "More": 3 to 7 days. */
export const MORE_PRESETS = [72, 96, 120, 144, 168] as const;
/** The earliest End, from now. create_room needs 5 minutes; the margin covers the time spent on the screen. */
export const MIN_END_LEAD_MS = 15 * 60_000;

/** The plan's longest room. A Plus flag that is still loading (null) counts as Free. */
export function maxRoomHours(plus: boolean | null) {
  return plus ? PLUS_MAX_HOURS : FREE_MAX_HOURS;
}

/** Sports rooms default to 3 hours; other types to the longest Free room (2 days), or 4 days on Plus. */
export function defaultEndHours(type: string, plus: boolean | null) {
  if (type === 'sports') return 3;
  return plus ? 96 : FREE_MAX_HOURS;
}

/** A preset stays relative to "now" until Create; a picked End is a fixed instant. */
export type EndChoice = { kind: 'preset'; hours: number } | { kind: 'at'; ms: number };

export function endMs(choice: EndChoice, now: number) {
  return choice.kind === 'preset' ? now + choice.hours * HOUR : choice.ms;
}

/** The End picker's range. */
export function endRange(now: number, plus: boolean | null) {
  return { start: new Date(now + MIN_END_LEAD_MS), end: new Date(now + maxRoomHours(plus) * HOUR) };
}

export function endError(ms: number, now: number, plus: boolean | null): 'tooSoon' | 'tooLong' | null {
  if (ms < now + 5 * 60_000) return 'tooSoon';
  if (ms > now + maxRoomHours(plus) * HOUR) return 'tooLong';
  return null;
}

/** Which preset chip is selected: a preset End selects its chip; More presets select "More". */
export function selectedPreset(choice: EndChoice): number | 'more' | null {
  if (choice.kind !== 'preset') return null;
  return (QUICK_PRESETS as readonly number[]).includes(choice.hours) ? choice.hours : 'more';
}

/**
 * The Trok AI switch on Create room: Plus toggles; a Free host turning it on opens the Plus screen instead (never a
 * grey switch with no reason). Turning it off always works; nothing happens while the plan loads.
 */
export function aiSwitchAction(plus: boolean | null, next: boolean): 'toggle' | 'upgrade' | null {
  if (!next || plus) return 'toggle';
  return plus === null ? null : 'upgrade';
}

/**
 * UX3-A12 / D2: the AI switch value. The host's own choice wins; until then it is on for a Plus host and off for Free
 * or while the plan is still loading. `firstPlus` is the first resolved plan, so a later offline blip doesn't flip it.
 */
export function aiEnabledValue(picked: boolean | null, firstPlus: boolean | null): boolean {
  return picked ?? firstPlus === true;
}

/** What tapping "More" does: Plus opens the 3–7 day choices, Free opens the upgrade screen, loading does nothing. */
export function moreAction(plus: boolean | null): 'choices' | 'upgrade' | null {
  if (plus === null) return null;
  return plus ? 'choices' : 'upgrade';
}
