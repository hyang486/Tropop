/**
 * G-1: runs a fetch for `key` and applies its result only if `key` is still the current key when
 * the fetch settles, so a slow fetch for an old filter cannot overwrite the newer filter's list.
 * Pure (no React) so the race can be tested.
 */
export type LoadOutcome<T> = { ok: true; data: T } | { ok: false; error: unknown };

export async function loadLatest<T>(
  key: string,
  currentKey: () => string,
  fetch: () => Promise<T>,
  apply: (outcome: LoadOutcome<T>) => void,
): Promise<'applied' | 'stale'> {
  let outcome: LoadOutcome<T>;
  try {
    outcome = { ok: true, data: await fetch() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  if (currentKey() !== key) return 'stale';
  apply(outcome);
  return 'applied';
}
