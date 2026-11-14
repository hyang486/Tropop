import { useEffect, useState } from 'react';

import { onDismissSheets } from './dismiss-sheets';

/** How long the sheet stays on animationType 'none' after a link closed it (covers the native dismiss). */
const INSTANT_MS = 600;

/**
 * UX2-46: pass the sheet's close while it is open (null while closed). When a link or notification tap
 * navigates, close runs and this returns true for a moment; the sheet sets animationType="none" then, so it
 * disappears at once instead of sliding out over the new screen.
 */
export function useDismissOnLink(close: (() => void) | null): boolean {
  const [instant, setInstant] = useState(false);
  useEffect(() => {
    if (!close) return;
    return onDismissSheets(() => {
      setInstant(true);
      close();
    });
  }, [close]);
  useEffect(() => {
    if (!instant) return;
    const t = setTimeout(() => setInstant(false), INSTANT_MS);
    return () => clearTimeout(t);
  }, [instant]);
  return instant;
}
