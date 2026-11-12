import { summaryFor } from './pace-core';
import { loadHistory } from './storage';

/**
 * For the recap (features/recap, spec 3.3): my latest pace-maker session in this room, or null when I did not
 * use the pace maker there or ran under 100 m. Meters, seconds, and seconds per km. On this device only.
 */
export async function getActivitySummary(
  roomId: string,
): Promise<{ distanceM: number; durationS: number; avgSecPerKm: number } | null> {
  return summaryFor(await loadHistory(), roomId);
}
