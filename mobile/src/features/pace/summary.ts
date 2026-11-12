import { recapParts, summaryFor } from './pace-core';
import { loadHistory } from './storage';
import { paceStrings as t } from './strings';

export type ActivitySummary = { distanceM: number; durationS: number; avgSecPerKm: number };

/**
 * For the recap (features/recap, spec 3.3): my latest pace-maker session in this room, or null when I did not
 * use the pace maker there, ran under 100 m, or the history cannot be read (never rejects). Meters, moving
 * seconds, and seconds per km of moving time. On this device only.
 */
export async function getActivitySummary(roomId: string): Promise<ActivitySummary | null> {
  return summaryFor(await loadHistory(), roomId);
}

/** The recap's pace line ("Pace maker: 2.40 km in 12:00, 5:00 per km"), or null with no session (no line). */
export function paceRecapLine(summary: ActivitySummary | null | undefined): string | null {
  const p = recapParts(summary);
  return p ? t.recap(p.distanceM, p.duration, p.pace) : null;
}
