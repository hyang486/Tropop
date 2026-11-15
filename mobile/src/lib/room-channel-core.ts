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

const TERMINAL = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

export function createRoomChannels<C>(client: ChannelClient<C>) {
  type Entry = { channel: C; listeners: Set<RoomListener>; status: ChannelStatus | null; dead: boolean };
  const entries = new Map<string, Entry>();

  function acquire(roomId: string, listener: RoomListener): () => void {
    let entry = entries.get(roomId);
    if (!entry) {
      const created = { listeners: new Set<RoomListener>(), status: null, dead: false } as unknown as Entry;
      created.channel = client.open(
        `room:${roomId}`,
        (payload) => {
          for (const l of [...created.listeners]) l.onEvent(payload as RoomEvent);
        },
        (status) => {
          created.status = status as ChannelStatus;
          // A dead channel leaves the map first, so a consumer acquiring now (even from inside onStatus)
          // opens a fresh channel instead of inheriting this one. Its listeners still get the status.
          if (TERMINAL.has(status) && !created.dead) {
            created.dead = true;
            if (entries.get(roomId) === created) entries.delete(roomId);
            // Not yet assigned when open() reports synchronously; removed right after open() below.
            if (created.channel !== undefined) client.remove(created.channel);
          }
          for (const l of [...created.listeners]) l.onStatus(status as ChannelStatus);
        },
      );
      if (created.dead) client.remove(created.channel);
      else entries.set(roomId, created);
      entry = created;
      // The status came before this listener was added; replay it.
      if (created.dead && created.status) {
        const status = created.status;
        queueMicrotask(() => listener.onStatus(status));
      }
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
      // An evicted (dead) entry was already removed; a newer entry for this room is never touched.
      if (mine.listeners.size === 0 && !mine.dead && entries.get(roomId) === mine) {
        entries.delete(roomId);
        client.remove(mine.channel);
      }
    };
  }

  return { acquire, size: () => entries.size, listenerCount: (roomId: string) => entries.get(roomId)?.listeners.size ?? 0 };
}
