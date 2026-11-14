// UX P2-10: one enter motion for overlays (Emergency bar, Q button). 200 ms ease-out; with Reduce Motion on,
// opacity only (no slide).
export const ENTER_MS = 200;
export const ENTER_RISE = 8;

export type EnterMotion = { duration: number; fromOpacity: number; fromTranslateY: number };

export function enterMotion(reduceMotion: boolean): EnterMotion {
  return { duration: ENTER_MS, fromOpacity: 0, fromTranslateY: reduceMotion ? 0 : ENTER_RISE };
}

/**
 * The Reduce Motion setting, or true when the read fails: a safety surface (Emergency bar) must still show,
 * without motion, rather than wait at opacity 0 for an answer that never comes.
 */
export function readReduceMotion(read: () => Promise<boolean>): Promise<boolean> {
  return Promise.resolve()
    .then(read)
    .catch(() => true);
}
