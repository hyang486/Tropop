/**
 * N-1: the bare app link `moment:///` must reset to the Rooms root instead of pushing a second
 * Rooms screen. Expo Router handles a link that arrives while the app runs as a navigate, which
 * pushes. `+native-intent` asks `rootLinkPlan` whether to take over; `+native-intent` has no auth
 * or navigation context, so the signed-in root navigator registers the handler that resets.
 * Pure parts (no Expo imports) so they can be tested in Node.
 */

/** True for the app's root URL (`moment:///`, `moment://`, `/`), ignoring query and hash. */
export function isRootLink(path: string): boolean {
  let rest = path.trim().replace(/[?#].*$/, '');
  const scheme = /^[a-z][a-z0-9+.-]*:/i.exec(rest);
  if (scheme) {
    rest = rest.slice(scheme[0].length);
    // A custom-scheme URL keeps its first path segment in the host slot (moment://join/x).
    if (rest.startsWith('//')) rest = rest.slice(2);
    else return false;
  }
  return /^\/*$/.test(rest);
}

/**
 * 'reset' = the registered handler resets to the root and the link itself is dropped.
 * 'pass' = default Expo Router handling (cold start, other links, or nobody signed in).
 */
export function rootLinkPlan(path: string, initial: boolean, hasHandler: boolean): 'reset' | 'pass' {
  if (initial || !hasHandler) return 'pass';
  return isRootLink(path) ? 'reset' : 'pass';
}

let resetHandler: (() => void) | null = null;

/** Set by the signed-in root navigator; null when signed out. */
export function setRootLinkHandler(handler: (() => void) | null) {
  resetHandler = handler;
}

/** Runs the handler for a root link and returns true, or returns false to let the link through. */
export function handleRootLink(path: string, initial: boolean): boolean {
  const handler = resetHandler;
  if (!handler || rootLinkPlan(path, initial, true) !== 'reset') return false;
  handler();
  return true;
}
