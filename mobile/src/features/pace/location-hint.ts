/**
 * C14 sweep 7: what the pace card says while the run has no position. 'denied' when Qrew can't read location,
 * 'finding' until the first fix, 'still' once `late` (FIX_WAIT_MS without one); null once a fix arrived or sharing is off.
 */
export const FIX_WAIT_MS = 30_000;

export type LocationHint = 'denied' | 'finding' | 'still' | null;

export function locationHint(o: { sharing: string; hasFix: boolean; late: boolean }): LocationHint {
  if (o.sharing === 'no-permission') return 'denied';
  if (o.hasFix || (o.sharing !== 'starting' && o.sharing !== 'sharing')) return null;
  return o.late ? 'still' : 'finding';
}
