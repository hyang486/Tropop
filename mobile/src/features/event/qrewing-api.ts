// Shared client API for Qrewing AI (planning/QREWING_AI_SPEC_EN.md section 3.1). Shapes mirror section 2.
import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { classifyQrewingError, isOfflineError, saveErrorKind } from './qrewing-plan';
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
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const json = await res.json().catch(() => null);
      return { error: classifyQrewingError(res.status, json?.error) };
    }
    return { error: 'network' };
  } catch {
    return { error: 'network' };
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

export async function requestMatches(roomId: string): Promise<MatchResult | { error: QrewingError }> {
  const res = await invokeQrewing<MatchResult>({ action: 'match', roomId });
  if ('error' in res) return res;
  return Array.isArray(res.data?.matches) ? res.data : { error: 'ai_failed' };
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

type RoomState = {
  aiEnabled: boolean;
  entryRequired: boolean;
  me: { aiOk: boolean; mute: boolean } | null;
  /** The last read never reached the server (offline). The state then reads as AI off but is not known. */
  readFailed: boolean;
};
const OFF: RoomState = { aiEnabled: false, entryRequired: false, me: null, readFailed: false };
const OFFLINE: RoomState = { ...OFF, readFailed: true };

/**
 * The room's Qrewing switches and my own consent/mute row. Any read failure (including the tables not existing
 * yet) reads as AI off, so no AI UI shows; `readFailed` tells an offline read apart so settings screens do not
 * show a switch they could not read.
 */
export function useQrewingRoom(roomId: string): RoomState & { reload(): void } {
  const [state, setState] = useState<RoomState>(OFF);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      const [room, member] = await Promise.all([
        db.from('qrewing_rooms').select('*').eq('room_id', roomId).maybeSingle<QrewingRoomRow>(),
        userId
          ? db.from('qrewing_members').select('*').eq('room_id', roomId).eq('user_id', userId).maybeSingle<QrewingMemberRow>()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!alive) return;
      if (room.error && isOfflineError(room.error)) {
        setState(OFFLINE);
        return;
      }
      if (room.error || !room.data?.ai_enabled) {
        setState(OFF);
        return;
      }
      const me = member.data ? { aiOk: member.data.ai_ok_at != null, mute: member.data.mute_small_talk } : null;
      setState({ aiEnabled: true, entryRequired: room.data.entry_required, me, readFailed: false });
    })().catch(() => {
      if (alive) setState(OFFLINE);
    });
    return () => {
      alive = false;
    };
  }, [roomId, tick]);

  return { ...state, reload };
}
