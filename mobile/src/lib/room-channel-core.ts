/**
 * Shared, ref-counted `room:<id>` channels (migration 0017). Every consumer (room screens, the Rooms list)
 * acquires through here and releases its own listener; the channel is removed only when the last listener goes.
 * We never rely on supabase-js returning the existing channel for a repeated topic name: a removeChannel from one
 * consumer must not end another consumer's subscription. Self-contained so node tests can load it.
 */
export type RoomEvent = {
  table: string;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  /** The row id, for tables that have an `id` column. */
  id?: string;
  /** expiry_reminders notices (migration 0019): the expiry version the reminders are for. */
  expiry_version?: number;
};

export type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

export type RoomListener = {
  onEvent: (event: RoomEvent) => void;
  onStatus: (status: ChannelStatus) => void;
};

/** The part of the Supabase client this module uses. */
export type ChannelClient<C> = {
  open: (topic: string, onPayload: (payload: unknown) => void, onStatus: (status: string) => void) => C;
  remove: (channel: C) => void;
};

export function createRoomChannels<C>(client: ChannelClient<C>) {
  type Entry = { channel: C; listeners: Set<RoomListener>; status: ChannelStatus | null };
  const entries = new Map<string, Entry>();

  function acquire(roomId: string, listener: RoomListener): () => void {
    let entry = entries.get(roomId);
    if (!entry) {
      const created = { listeners: new Set<RoomListener>(), status: null } as unknown as Entry;
      created.channel = client.open(
        `room:${roomId}`,
        (payload) => {
          for (const l of [...created.listeners]) l.onEvent(payload as RoomEvent);
        },
        (status) => {
          created.status = status as ChannelStatus;
          for (const l of [...created.listeners]) l.onStatus(status as ChannelStatus);
        },
      );
      entries.set(roomId, created);
      entry = created;
    } else if (entry.status) {
      // Late subscriber: report the current status so it can load right away.
      const status = entry.status;
      queueMicrotask(() => listener.onStatus(status));
    }
    const mine = entry;
    mine.listeners.add(listener);

    let released = false;
    return () => {
      // A second release of the same handle must not drop someone else's count.
      if (released) return;
      released = true;
      mine.listeners.delete(listener);
      if (mine.listeners.size === 0 && entries.get(roomId) === mine) {
        entries.delete(roomId);
        client.remove(mine.channel);
      }
    };
  }

  return { acquire, size: () => entries.size, listenerCount: (roomId: string) => entries.get(roomId)?.listeners.size ?? 0 };
}
