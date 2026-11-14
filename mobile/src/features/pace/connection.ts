import { useSyncExternalStore } from 'react';

/**
 * UX2-118: rooms whose pace layer could not read the room (offline or a failed getRoom), so the card says it is
 * waiting for a connection instead of finding a location. The layer sets it and retries on reconnect and foreground.
 */
const waiting = new Set<string>();
const listeners = new Set<() => void>();

export function setPaceWaiting(roomId: string, on: boolean) {
  if (waiting.has(roomId) === on) return;
  if (on) waiting.add(roomId);
  else waiting.delete(roomId);
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function usePaceWaiting(roomId: string): boolean {
  return useSyncExternalStore(subscribe, () => waiting.has(roomId));
}
