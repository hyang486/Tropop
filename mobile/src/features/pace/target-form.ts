import type { PaceTarget } from './pace-core';

/**
 * The Target pace field's prefill in s/km (E2E finding j): my saved target pace, else my usual pace, else null
 * (the field stays empty and its placeholder reads "e.g. 5:30", so it never looks like a filled value).
 */
export function initialPaceSec(target: PaceTarget, usual: number | null): number | null {
  return target.kind === 'pace' ? target.secPerKm : usual;
}

/** Save is enabled only when every field of the chosen mode has text; an empty field never reaches validation. */
export function targetFieldsFilled(mode: 'usual' | 'pace' | 'time', pace: string, km: string, time: string): boolean {
  if (mode === 'pace') return pace.trim() !== '';
  if (mode === 'time') return km.trim() !== '' && time.trim() !== '';
  return true;
}

/** UX P1-9: where the target tick sits on the pace bar (share of its width). */
export const TARGET_TICK = 0.8;

/**
 * UX P1-9: the pace bar's fill (0..1) against the target tick: on target fills to the tick, faster runs past it,
 * slower stops short. Null without a current pace or a target (the bar shows empty).
 */
export function targetBarFill(currentSecPerKm: number | null, goalSecPerKm: number | null): number | null {
  if (currentSecPerKm == null || goalSecPerKm == null || currentSecPerKm <= 0 || goalSecPerKm <= 0) return null;
  return Math.max(0, Math.min(1, (TARGET_TICK * goalSecPerKm) / currentSecPerKm));
}
