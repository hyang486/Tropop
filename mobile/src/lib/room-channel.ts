import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { createRoomChannels, type ChannelStatus, type RoomEvent } from './room-channel-core';
import { supabase } from './supabase';

export type { ChannelStatus, RoomEvent, RoomListener } from './room-channel-core';

// One channel per room, shared by every screen and hook that needs it: joining the same topic twice
// on one socket would make the server close the first join. Ref-counted in room-channel-core.
const channels = createRoomChannels<RealtimeChannel>({
  open: (topic, onPayload, onStatus) =>
    supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: '*' }, ({ payload }) => onPayload(payload))
      .subscribe((status) => onStatus(status)),
  remove: (channel) => {
    void supabase.removeChannel(channel);
  },
});

/** Acquires the shared `room:<id>` channel for one listener; the returned function releases only that listener. */
export const acquireRoomChannel = channels.acquire;
const subscribeRoom = channels.acquire;

/** Listens to the room's change notices. Handlers may change between renders without resubscribing. */
export function useRoomEvents(
  roomId: string,
  onEvent: (event: RoomEvent) => void,
  onStatus?: (status: ChannelStatus) => void,
) {
  const handlers = useRef({ onEvent, onStatus });
  useLayoutEffect(() => {
    handlers.current = { onEvent, onStatus };
  });

  useEffect(
    () =>
      subscribeRoom(roomId, {
        onEvent: (e) => handlers.current.onEvent(e),
        onStatus: (s) => handlers.current.onStatus?.(s),
      }),
    [roomId],
  );
}
