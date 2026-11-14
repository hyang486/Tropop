// UX3-A10: pure helpers for the join code screen (no React Native imports, so tests can load them).
import { en } from '@/i18n/en';
import { isOfflineError } from '@/features/event/qrewing-plan';
import { RoomError } from '@/lib/rooms';

/** Shake: 6 pt, 3 cycles, 300 ms in all (six 50 ms steps, ending at rest). */
export const SHAKE_STEPS: readonly { x: number; ms: number }[] = [
  { x: 6, ms: 25 },
  { x: -6, ms: 50 },
  { x: 6, ms: 50 },
  { x: -6, ms: 50 },
  { x: 6, ms: 50 },
  { x: -6, ms: 50 },
  { x: 0, ms: 25 },
];

/** The red line under the boxes for a failed check. */
export function codeErrorText(e: unknown): string {
  if (e instanceof RoomError) return e.kind === 'invalid' ? en.join.noRoom : e.message;
  if (isOfflineError(e)) return en.errors.offline;
  return e instanceof Error ? e.message : en.join.noRoom;
}
