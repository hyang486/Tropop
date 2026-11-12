// Recap fetch and on-device save (spec 3.3): `{ server recap, per-user part, savedAt }` under
// `qrewing.recap.v1.<roomId>`, so the Room ended screen can show it after the server deleted the room.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requestRecap } from '@/features/event/qrewing-api';
import { isOfflineError } from '@/features/event/qrewing-plan';
import type { RoomRecapRow } from '@/features/event/types';
import { loadFaceData } from '@/lib/face';
import { supabase } from '@/lib/supabase';

import {
  EMPTY_MARK,
  END_RECAP_TIMEOUT_MS,
  mergeMyPart,
  type MyPart,
  parseMark,
  parseSavedRecap,
  type RecapMark,
  recapKey,
  recapMarkKey,
  type RecapMiss,
  type SavedRecap,
  type ServerRecap,
  withTimeout,
} from './recap-plan';

// Untyped until database.types.ts is regenerated after migration 0027 (see qrewing-api.ts).
const db = supabase as unknown as SupabaseClient;

export async function loadSavedRecap(roomId: string): Promise<SavedRecap | null> {
  try {
    return parseSavedRecap(await AsyncStorage.getItem(recapKey(roomId)));
  } catch {
    return null;
  }
}

export async function loadMark(roomId: string): Promise<RecapMark | null> {
  try {
    return parseMark(await AsyncStorage.getItem(recapMarkKey(roomId)));
  } catch {
    return null;
  }
}

/** Remembers that this room had Qrewing AI on (so Room ended can say "No recap was saved") and which calls ran. */
export async function saveMark(roomId: string, patch: Partial<Omit<RecapMark, 'ai'>>): Promise<RecapMark> {
  const next: RecapMark = { ...((await loadMark(roomId)) ?? EMPTY_MARK), ...patch, ai: true };
  try {
    await AsyncStorage.setItem(recapMarkKey(roomId), JSON.stringify(next));
  } catch {
    // Storage full or unavailable: the calls may repeat once, which the server answers from its cache.
  }
  return next;
}

async function countOrNull(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const { count, error } = await q;
    return error ? null : count;
  } catch {
    return null;
  }
}

/** The per-user part (no AI). Each field is read on its own; one that fails (or is closed in grace) is null. */
export async function readMyPart(roomId: string, userId: string): Promise<MyPart> {
  const [messages, mediaShared, photosOfMe, arrivedAt] = await Promise.all([
    countOrNull(
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('sender_id', userId)
        .eq('kind', 'text'),
    ),
    countOrNull(
      supabase.from('media').select('id', { count: 'exact', head: true }).eq('room_id', roomId).eq('uploader_id', userId),
    ),
    loadFaceData(roomId, userId)
      .then((d) => (d.enrollment ? d.matches.filter((m) => m.matched && !m.excluded).length : null))
      .catch(() => null),
    Promise.resolve(
      supabase
        .from('arrivals')
        .select('arrived_at')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .order('arrived_at', { ascending: true })
        .limit(1),
    )
      .then(({ data }) => data?.[0]?.arrived_at ?? null)
      .catch(() => null),
  ]);
  // Pace summary: features/pace `getActivitySummary` joins at the merge step (spec 3.3); null until then.
  return { messages, mediaShared, photosOfMe, arrivedAt, pace: null };
}

async function save(roomId: string, userId: string, server: ServerRecap): Promise<SavedRecap> {
  const prev = await loadSavedRecap(roomId);
  const me = mergeMyPart(prev?.me, await readMyPart(roomId, userId));
  const saved: SavedRecap = { server, me, savedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(recapKey(roomId), JSON.stringify(saved));
  } catch {
    // Not saved on this device; the Room ended screen then says no recap was saved.
  }
  return saved;
}

/**
 * Asks the server for the recap and saves it when done. A pending answer (another member's call is writing it)
 * is left to the broadcast or the next read. Returns the saved recap, or null.
 */
export async function fetchAndSaveRecap(roomId: string, userId: string, opts?: { refresh?: boolean }): Promise<SavedRecap | null> {
  const res = await requestRecap(roomId, opts);
  if ('error' in res || res.state !== 'done') return null;
  return save(roomId, userId, {
    title: res.title,
    summary: res.summary,
    highlights: res.highlights,
    generatedAt: res.generatedAt,
  });
}

/** Trigger C: after a `room_recaps` notice, read the row through RLS and save it when done. */
export async function readAndSaveRecap(roomId: string, userId: string): Promise<SavedRecap | null> {
  try {
    const { data } = await db.from('room_recaps').select('*').eq('room_id', roomId).maybeSingle<RoomRecapRow>();
    if (!data || data.state !== 'done' || !data.title || !data.summary) return null;
    return save(roomId, userId, {
      title: data.title,
      summary: data.summary,
      highlights: data.highlights ?? [],
      generatedAt: data.updated_at,
    });
  } catch {
    return null;
  }
}

/**
 * Spec 7.3 early end: called by the host's End flow right after `end_room` succeeded (the room is in grace, so the
 * recap is allowed). Only for rooms this device knows had Qrewing on. Runs in the background with a 15 s limit;
 * it never blocks or delays leaving the End screen.
 */
export function recapAfterEnd(roomId: string, userId: string | undefined): void {
  if (!userId) return;
  loadMark(roomId)
    .then((mark) => {
      if (!mark?.ai) return null;
      return withTimeout(fetchAndSaveRecap(roomId, userId), END_RECAP_TIMEOUT_MS, null);
    })
    .catch(() => {});
}

/**
 * Room ended without a copy on this phone (spec 7.3 grace): read the shared row (RLS allows it in grace), then,
 * only when `ask` (this phone knows the room had Qrewing on), ask once. Says why there is no recap, so the card can
 * tell "still writing" and "offline" apart from "no recap was saved". Without `ask`, a missing row (AI off, or no
 * recap yet) is `gone`; the room_recaps notice re-runs this when the row arrives.
 */
export async function recapForEndedRoom(
  roomId: string,
  userId: string,
  opts: { ask: boolean },
): Promise<{ saved: SavedRecap } | { miss: RecapMiss }> {
  try {
    const { data, error } = await db.from('room_recaps').select('*').eq('room_id', roomId).maybeSingle<RoomRecapRow>();
    if (error) return { miss: isOfflineError(error) ? 'offline' : 'gone' };
    if (data?.state === 'done' && data.title && data.summary) {
      return {
        saved: await save(roomId, userId, {
          title: data.title,
          summary: data.summary,
          highlights: data.highlights ?? [],
          generatedAt: data.updated_at,
        }),
      };
    }
    if (data?.state === 'pending') return { miss: 'pending' };
  } catch (e) {
    return { miss: isOfflineError(e) ? 'offline' : 'gone' };
  }
  if (!opts.ask) return { miss: 'gone' };
  const res = await requestRecap(roomId);
  if ('error' in res) return { miss: res.error === 'network' ? 'offline' : 'gone' };
  if (res.state !== 'done') return { miss: 'pending' };
  return {
    saved: await save(roomId, userId, {
      title: res.title,
      summary: res.summary,
      highlights: res.highlights,
      generatedAt: res.generatedAt,
    }),
  };
}
