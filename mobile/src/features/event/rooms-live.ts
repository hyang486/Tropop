/**
 * P3: keeps the Rooms list's last-item lines live while the list is focused. It listens on the shared private
 * `room:<id>` broadcast topics (0017) of the open rooms the list shows, and a messages INSERT refetches the
 * summaries once, debounced. No polling; the refetch goes through RLS. Self-contained so node tests can load it.
 */
type RoomEventLike = { table: string; op: string };
type Listener = { onEvent: (event: RoomEventLike) => void; onStatus: (status: string) => void };

export type RoomsLiveDeps = {
  acquire: (roomId: string, listener: Listener) => () => void;
  refetch: () => void;
  delayMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export const ROOMS_LIVE_DEBOUNCE_MS = 1000;

export function createRoomsLive(deps: RoomsLiveDeps) {
  const delay = deps.delayMs ?? ROOMS_LIVE_DEBOUNCE_MS;
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const joined = new Map<string, () => void>();
  let timer: unknown = null;
  let stopped = false;

  function schedule() {
    if (stopped) return;
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      if (!stopped) deps.refetch();
    }, delay);
  }

  const listener: Listener = {
    onEvent: (e) => {
      // member_status: an Emergency can end with no message line (e.g. the member leaves the room).
      if ((e.table === 'messages' && e.op === 'INSERT') || e.table === 'member_status') schedule();
    },
    onStatus: () => undefined,
  };

  /** Joins the topics of `roomIds` and leaves the ones no longer listed. */
  function setRooms(roomIds: readonly string[]) {
    if (stopped) return;
    const next = new Set(roomIds);
    for (const [id, release] of joined) {
      if (!next.has(id)) {
        release();
        joined.delete(id);
      }
    }
    for (const id of next) {
      // Each join gets its own listener object so the shared channel counts it separately.
      if (!joined.has(id)) joined.set(id, deps.acquire(id, { ...listener }));
    }
  }

  /** Leaves every topic and drops a pending refetch. The instance is done after this. */
  function stop() {
    stopped = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
    for (const release of joined.values()) release();
    joined.clear();
  }

  return { setRooms, stop, joined: () => [...joined.keys()] };
}
