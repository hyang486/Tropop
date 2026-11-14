import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { en } from '@/i18n/en';
import type { Tables } from './database.types';
import { isEmergencyActiveError } from './emergency-plan';
import { appError } from './errors';
import { useRoomEvents } from './room-channel';
import { supabase } from './supabase';

type AckRow = { event_id: string; user_id: string; on_way?: boolean; on_way_at?: string | null };
type UntypedRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

const ACTIVITY_TABLES = new Set(['member_status', 'status_definitions', 'emergency_events', 'emergency_acks', 'arrivals']);

export type StatusDefinition = Tables<'status_definitions'>;

/** An Emergency that is still open: its sender's current status is still Emergency. */
export type OpenEmergency = {
  id: string;
  userId: string;
  createdAt: string;
  /** Members (other than the sender) who acknowledged it (an ack row: seen, or on the way). */
  ackedBy: Set<string>;
  /** Members on the way ("On my way", 0040), first to answer first. */
  onWay: string[];
};

export type RoomActivity = {
  loading: boolean;
  error: unknown;
  /** Host-defined statuses in order, Emergency last. */
  statuses: StatusDefinition[];
  /** Current status per member (user id -> status definition id). */
  memberStatus: Map<string, string>;
  /** When the current user tapped Arrived in the current activity, or null. */
  myArrivedAt: string | null;
  emergencies: OpenEmergency[];
};

const EMPTY: RoomActivity = {
  loading: true,
  error: null,
  statuses: [],
  memberStatus: new Map(),
  myArrivedAt: null,
  emergencies: [],
};

async function fetchActivity(roomId: string, userId: string, activitySeq: number): Promise<Omit<RoomActivity, 'loading'>> {
  const [defs, member, arrival, events] = await Promise.all([
    supabase.from('status_definitions').select('*').eq('room_id', roomId).order('sort'),
    supabase.from('member_status').select('user_id, status_id').eq('room_id', roomId),
    supabase
      .from('arrivals')
      .select('arrived_at')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      // E2E (c): Arrived means arrived at the meetup, so my first arrival in any activity keeps the chip set.
      .order('arrived_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('emergency_events')
      .select('id, user_id, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  for (const r of [defs, member, arrival, events]) if (r.error) throw r.error;

  const statuses = [...(defs.data ?? [])].sort(
    (a, b) => Number(a.is_emergency) - Number(b.is_emergency) || a.sort - b.sort,
  );
  const emergencyId = statuses.find((s) => s.is_emergency)?.id;
  const memberStatus = new Map((member.data ?? []).map((m) => [m.user_id, m.status_id]));

  // Latest event per member whose status is still Emergency.
  const open: OpenEmergency[] = [];
  const seen = new Set<string>();
  for (const e of events.data ?? []) {
    if (seen.has(e.user_id)) continue;
    seen.add(e.user_id);
    if (emergencyId && memberStatus.get(e.user_id) === emergencyId) {
      open.push({ id: e.id, userId: e.user_id, createdAt: e.created_at, ackedBy: new Set(), onWay: [] });
    }
  }
  if (open.length > 0) {
    // 0040: on_way / on_way_at are not in the generated types yet.
    const acks = (await supabase
      .from('emergency_acks')
      .select('event_id, user_id, on_way, on_way_at')
      .in(
        'event_id',
        open.map((e) => e.id),
      )) as unknown as { data: AckRow[] | null; error: unknown };
    if (acks.error) throw acks.error;
    const rows = [...(acks.data ?? [])].sort((a, b) => (a.on_way_at ?? '').localeCompare(b.on_way_at ?? ''));
    for (const a of rows) {
      const ev = open.find((e) => e.id === a.event_id);
      if (!ev || a.user_id === ev.userId) continue;
      ev.ackedBy.add(a.user_id);
      if (a.on_way) ev.onWay.push(a.user_id);
    }
  }

  return { error: null, statuses, memberStatus, myArrivedAt: arrival.data?.arrived_at ?? null, emergencies: open };
}

// UX2-05b: the last status list read per room, so a failed read (even after reopening the room) keeps its tiles.
const statusCache = new Map<string, StatusDefinition[]>();

/**
 * Arrival, statuses and open Emergencies for a room. Refetches on any related room change notice,
 * after a (re)subscribe, when activity_seq changes and when the app returns to the foreground.
 */
export function useRoomActivity(roomId: string, userId: string | undefined, activitySeq: number) {
  const [state, setState] = useState<RoomActivity>(EMPTY);
  const seq = useRef(0);
  // UX2-107: the room channel has not been SUBSCRIBED for over 5 s (live notices may be missed), and the first
  // read has taken over 3 s. `rearm` restarts the 5 s wait after a manual read that worked.
  const [subscribed, setSubscribed] = useState(false);
  const [stale, setStale] = useState(false);
  const [rearm, setRearm] = useState(0);
  const [slow, setSlow] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    const mine = ++seq.current;
    try {
      const next = await fetchActivity(roomId, userId, activitySeq);
      statusCache.set(roomId, next.statuses);
      if (mine === seq.current) {
        setState({ ...next, loading: false });
        setStale(false);
        setRearm((n) => n + 1);
      }
    } catch (error) {
      if (mine === seq.current)
        setState((s) => ({
          ...s,
          statuses: s.statuses.length > 0 ? s.statuses : (statusCache.get(roomId) ?? []),
          loading: false,
          error,
        }));
    }
  }, [roomId, userId, activitySeq]);

  // Change notices from the room's private Broadcast topic; content is always refetched through RLS.
  useRoomEvents(
    roomId,
    (event) => {
      if (ACTIVITY_TABLES.has(event.table)) reload();
    },
    (status) => {
      if (status === 'SUBSCRIBED') {
        setSubscribed(true);
        setStale(false);
        reload();
      } else setSubscribed(false);
    },
  );

  useEffect(() => {
    if (subscribed) return;
    const timer = setTimeout(() => setStale(true), 5000);
    return () => clearTimeout(timer);
  }, [subscribed, rearm]);

  const firstRead = state.loading;
  useEffect(() => {
    if (!firstRead) return;
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, [firstRead]);

  useEffect(() => {
    reload();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  const arrive = useCallback(async () => {
    const { error } = await supabase.rpc('mark_arrived', { p_room_id: roomId });
    if (error) throw error;
    await reload();
  }, [roomId, reload]);

  const setStatus = useCallback(
    async (statusId: string) => {
      const { error } = await supabase.rpc('set_my_status', { p_room_id: roomId, p_status_id: statusId });
      if (error && isEmergencyActiveError(error)) {
        // UX2-52 server guard: my Emergency is still on (a race or stale list). Reload so the picker shows
        // "I'm OK now", then say why instead of the generic error (PT409 alone would read as "room full").
        await reload().catch(() => {});
        throw appError(en.activity.emergencyActiveError);
      }
      if (error) throw error;
      await reload();
    },
    [roomId, reload],
  );

  /**
   * UX2-05b: sets my status to the room's Emergency even when the status list failed: the loaded or cached row,
   * else one read of the room's Emergency row (every room has one), then the usual set_my_status.
   */
  const statuses = state.statuses;
  const setEmergency = useCallback(async () => {
    let id = (statuses.length > 0 ? statuses : (statusCache.get(roomId) ?? [])).find((s) => s.is_emergency)?.id;
    if (!id) {
      const { data, error } = await supabase
        .from('status_definitions')
        .select('id')
        .eq('room_id', roomId)
        .eq('is_emergency', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(en.activity.actionFailed);
      id = data.id;
    }
    const { error } = await supabase.rpc('set_my_status', { p_room_id: roomId, p_status_id: id });
    if (error) throw error;
    await reload();
  }, [roomId, statuses, reload]);

  const clearStatus = useCallback(async () => {
    const { error } = await supabase.rpc('clear_my_status', { p_room_id: roomId });
    if (error) throw error;
    await reload();
  }, [roomId, reload]);

  const acknowledge = useCallback(
    async (eventId: string) => {
      const { error } = await supabase.rpc('ack_emergency', { p_event_id: eventId });
      if (error) throw error;
      await reload();
    },
    [reload],
  );

  // Emergency "On my way" (0040): on=true implies seen; on=false is "Can't come" (the seen row stays).
  const setOnWay = useCallback(
    async (eventId: string, on: boolean) => {
      const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
      const { error } = await rpc('set_emergency_on_way', { p_event_id: eventId, p_on: on });
      if (error) throw error;
      await reload();
    },
    [reload],
  );

  return { ...state, stale, slow, reload, arrive, setStatus, setEmergency, clearStatus, acknowledge, setOnWay };
}
