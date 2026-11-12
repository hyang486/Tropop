// Shared client API for Qrewing AI (planning/QREWING_AI_SPEC_EN.md section 3.1). Shapes mirror section 2.
import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import {
  classifyQrewingError,
  invokeFailureKind,
  isOfflineError,
  type QrewingRoomState,
  ROOM_READ_FAILED,
  ROOM_UNKNOWN,
  roomStateFrom,
  saveErrorKind,
} from './qrewing-plan';
import type { MatchResult, QrewingError, QrewingMemberRow, QrewingRoomRow, RecapResult, TriageResult } from './types';

export type { MatchResult, QrewingError, RecapResult, TriageResult } from './types';
export { isQrewingError } from './qrewing-plan';

/**
 * The five Qrewing tables and their RPCs are not in `database.types.ts` until migration 0027 is applied and
 * the types are regenerated, so these calls go through an untyped view of the same client.
 */
const db = supabase as unknown as SupabaseClient;

type Invoke<T> = { data: T } | { error: QrewingError };

async function invokeQrewing<T>(body: Record<string, unknown>): Promise<Invoke<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('qrewing', { body });
    if (!error) return { data: data as T };
    const kind = error instanceof FunctionsHttpError ? 'http' : invokeFailureKind(error);
    if (kind === 'http') {
      const res = error.context as Response;
      const json = await res.json().catch(() => null);
      return { error: classifyQrewingError(res.status, json?.error) };
    }
    // A relay error or other answer from Supabase is a server failure, not "No connection".
    return { error: kind === 'network' ? 'network' : 'ai_failed' };
  } catch (e) {
    return { error: isOfflineError(e) ? 'network' : 'ai_failed' };
  }
}

export async function probeQrewing(roomId: string): Promise<{ ok: true } | { error: QrewingError }> {
  const res = await invokeQrewing<{ ok: true }>({ action: 'probe', roomId });
  return 'error' in res ? res : { ok: true };
}

export async function triageMessages(roomId: string, messageIds: string[]): Promise<TriageResult[] | { error: QrewingError }> {
  const res = await invokeQrewing<{ results: TriageResult[] }>({ action: 'triage', roomId, messageIds: messageIds.slice(0, 5) });
  if ('error' in res) return res;
  return Array.isArray(res.data?.results) ? res.data.results : { error: 'ai_failed' };
}

/** `refresh` (spec 7.2): one cheap update with newer messages; the server returns the cached row otherwise. */
export async function requestRecap(
  roomId: string,
  opts?: { refresh?: boolean },
): Promise<RecapResult | { state: 'pending' } | { error: QrewingError }> {
  const res = await invokeQrewing<RecapResult | { state: 'pending' }>({
    action: 'recap',
    roomId,
    ...(opts?.refresh ? { refresh: true } : {}),
  });
  if ('error' in res) return res;
  if (res.data?.state === 'done' || res.data?.state === 'pending') return res.data;
  return { error: 'ai_failed' };
}

/** 200 list (maybe cached/stale), or 202 `{ state: 'pending' }` while another call for my list runs (68132d6). */
export async function requestMatches(roomId: string): Promise<MatchResult | { state: 'pending' } | { error: QrewingError }> {
  const res = await invokeQrewing<MatchResult | { state: 'pending' }>({ action: 'match', roomId });
  if ('error' in res) return res;
  if (res.data && 'state' in res.data && res.data.state === 'pending') return { state: 'pending' };
  return res.data && 'matches' in res.data && Array.isArray(res.data.matches) ? res.data : { error: 'ai_failed' };
}

export async function setQrewingRoom(roomId: string, aiEnabled: boolean, entryRequired: boolean): Promise<{ error?: string; offline?: boolean }> {
  const { error } = await db.rpc('set_qrewing_room', {
    p_room_id: roomId,
    p_ai_enabled: aiEnabled,
    p_entry_required: entryRequired,
  });
  return error ? { error: error.message, offline: saveErrorKind(error) === 'network' } : {};
}

export async function setQrewingMember(roomId: string, aiOk: boolean, mute: boolean): Promise<{ error?: string; offline?: boolean }> {
  const { error } = await db.rpc('set_qrewing_member', { p_room_id: roomId, p_ai_ok: aiOk, p_mute: mute });
  return error ? { error: error.message, offline: saveErrorKind(error) === 'network' } : {};
}

type RoomState = QrewingRoomState;

/**
 * The room's Qrewing switches and my own consent/mute row (roomStateFrom). Any failed room read is `readFailed`
 * (no AI UI shows, settings screens say they could not load, chat retries); a missing row or missing table is off.
 * `loaded` is false until the first read answers; an empty `roomId` never reads.
 */
export function useQrewingRoom(roomId: string): RoomState & { reload(): void } {
  const [state, setState] = useState<RoomState>(ROOM_UNKNOWN);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    if (!roomId) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      const [room, member] = await Promise.all([
        db.from('qrewing_rooms').select('*').eq('room_id', roomId).maybeSingle<QrewingRoomRow>(),
        userId
          ? db.from('qrewing_members').select('*').eq('room_id', roomId).eq('user_id', userId).maybeSingle<QrewingMemberRow>()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (alive) setState(roomStateFrom(room, member));
    })().catch(() => {
      if (alive) setState(ROOM_READ_FAILED);
    });
    return () => {
      alive = false;
    };
  }, [roomId, tick]);

  return { ...state, reload };
}
