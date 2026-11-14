/** UX2-131: pure helper for the Create room people stepper (no runtime imports, so `npm test` can load it). */

/**
 * The line under the stepper when a typed count was clamped DOWN to the plan max, else null. Free: "Free rooms hold
 * up to 6." with a See Plus link. Plus: "Rooms hold up to 30." with no link. A plan still loading (null) shows
 * nothing. `max` is capacityMax(plus).
 */
export function capacityClampNote(
  text: string,
  plus: boolean | null,
  max: number,
  copy: { clampFree: (n: number) => string; clampPlus: (n: number) => string },
): { text: string; link: boolean } | null {
  if (plus === null) return null;
  const t = text.trim();
  if (!/^\d{1,4}$/.test(t) || Number(t) <= max) return null;
  return plus ? { text: copy.clampPlus(max), link: false } : { text: copy.clampFree(max), link: true };
}
