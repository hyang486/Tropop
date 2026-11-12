import { type PaceSummary, recapParts, summaryFor } from './pace-core';
import { loadHistory } from './storage';
import { paceStrings as t } from './strings';

export type ActivitySummary = PaceSummary;

/**
 * For the recap (features/recap, spec 3.3): my latest pace-maker session in this room, or null when I did not
 * use the pace maker there, ran under 100 m, or the history cannot be read (never rejects). Meters, moving
 * seconds (durationS), seconds first to last fix with stops (elapsedS), and seconds per km of moving time.
 * On this device only.
 */
export async function getActivitySummary(roomId: string): Promise<ActivitySummary | null> {
  return summaryFor(await loadHistory(), roomId);
}

/** The recap's pace line ("Pace maker: 2.40 km, moving 12:00, total 17:00, 5:00 per km"), or null with no session. */
export function paceRecapLine(summary: ActivitySummary | null | undefined): string | null {
  const p = recapParts(summary);
  return p ? t.recap(p.distanceM, p.moving, p.total, p.pace) : null;
}
