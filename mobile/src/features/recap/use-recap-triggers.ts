// Recap triggers on the open room screen (spec 7.3 scheduled end, 3.3 trigger C).
import { useEffect, useRef } from 'react';

import { useRoomEvents } from '@/lib/room-channel';

import { recapStep, stepCall } from './recap-plan';
import { fetchAndSaveRecap, loadMark, readAndSaveRecap, saveMark } from './recap-store';

/**
 * In an AI room: remembers the room had Qrewing on, asks for the recap once at 60 minutes left and once more with
 * `refresh` in the last 10 minutes (each once per device, kept in AsyncStorage), and saves a recap announced on
 * the room channel. Never blocks the screen; every failure is silent (the Room ended screen says when nothing
 * was saved).
 */
export function useRecapTriggers(roomId: string, userId: string | undefined, aiEnabled: boolean, remainingMs: number) {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!aiEnabled || !userId || inFlight.current) return;
    inFlight.current = true;
    (async () => {
      const mark = (await loadMark(roomId)) ?? (await saveMark(roomId, {}));
      const step = recapStep(remainingMs, mark);
      if (!step) return;
      const call = stepCall(step);
      // Marked before the call, so a slow or failed call is not repeated on the next tick.
      await saveMark(roomId, call.mark);
      await fetchAndSaveRecap(roomId, userId, call.refresh ? { refresh: true } : undefined);
    })()
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, [roomId, userId, aiEnabled, remainingMs]);

  useRoomEvents(roomId, (e) => {
    if (e.table === 'room_recaps' && aiEnabled && userId) readAndSaveRecap(roomId, userId).catch(() => {});
  });
}
