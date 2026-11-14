// UX3-A01 (S1) client calls for migration 0037 (room_list_summaries, mark_room_read). database.types.ts predates
// 0037, so the RPCs are typed here by hand; regenerate the types after 0037 is live and drop the cast.
import type { PostgrestError } from '@supabase/supabase-js';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { supabase } from '@/lib/supabase';

import type { RoomSummary } from './room-summary';

type UntypedRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;

/**
 * Last item and unread count per open room I belong to, keyed by room id. null when the read fails (0037 not live
 * yet, offline): the rows then show no last-item line, time or pill rather than a wrong "No messages yet".
 */
export async function fetchRoomSummaries(roomIds: string[]): Promise<Map<string, RoomSummary> | null> {
  if (roomIds.length === 0) return new Map();
  const { data, error } = await rpc('room_list_summaries', { p_room_ids: roomIds });
  if (error || !Array.isArray(data)) return null;
  return new Map((data as RoomSummary[]).map((s) => [s.room_id, s]));
}

/** Sets my last_read_at in this room to now. Failures are ignored: unread is a hint, not a record. */
export function markRoomRead(roomId: string) {
  void Promise.resolve(rpc('mark_room_read', { p_room_id: roomId })).catch(() => undefined);
}

/**
 * Spec S1: last_read_at moves to now when the chat screen is focused, on each new message received while it is
 * focused, and on blur. `newestId` is the newest chat item's id.
 */
export function useMarkRoomRead(roomId: string, newestId: string | undefined) {
  const focused = useIsFocused();
  useFocusEffect(
    useCallback(() => {
      markRoomRead(roomId);
      return () => markRoomRead(roomId);
    }, [roomId]),
  );
  useEffect(() => {
    if (focused && newestId) markRoomRead(roomId);
    // Only a new newest item marks again; focus and blur are handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestId]);
}
