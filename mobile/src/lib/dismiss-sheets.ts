/**
 * UX2-46: one "dismiss sheets" event. Before a warm deep link or a notification tap navigates, every open
 * custom sheet (a React Native Modal: Notices, status picker, Your question, pace target, …) closes without
 * animation, so it never covers the screen the link opens. Sheets subscribe through useDismissOnLink.
 * Unsaved sheet input is dropped (ux OK).
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe an open sheet's close; returns the unsubscribe. */
export function onDismissSheets(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Close every subscribed sheet. A throwing listener never stops the others. Returns how many ran. */
export function dismissSheets(): number {
  let ran = 0;
  for (const listener of [...listeners]) {
    try {
      listener();
      ran += 1;
    } catch (e) {
      console.warn('[dismiss-sheets] a sheet failed to close', e);
    }
  }
  return ran;
}
