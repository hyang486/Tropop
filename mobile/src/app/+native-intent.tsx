import { handleRootLink } from '@/lib/root-link';

// Native-only URL hook (Expo Router). N-1: a `moment:///` link while signed in resets to the
// Rooms root (see root-link.ts) and is then dropped, so no duplicate Rooms screen is pushed.
// Every other link (join/<token>, cold start, signed out) passes through unchanged.
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (handleRootLink(path, initial)) return null;
  } catch (e) {
    console.warn('[root-link] reset failed', e);
  }
  return path;
}
