/** UX3-B05: the composer's trailing slot, and its cross-fade. Plain values so tests can import it. */
export const COMPOSER_FADE_MS = 150;

/** 'idle' shows the caller's action (Trok) while the field is empty, 'send' once text is typed or a send runs. */
export function composerSlot(value: string, busy: boolean, hasIdleAction: boolean): 'idle' | 'send' | 'none' {
  if (busy || value.trim().length > 0) return 'send';
  return hasIdleAction ? 'idle' : 'none';
}

/** Reduce Motion (or not yet known) swaps instantly. */
export function composerFadeMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : COMPOSER_FADE_MS;
}
