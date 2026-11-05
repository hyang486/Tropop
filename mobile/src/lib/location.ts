import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { Tables } from './database.types';
import {
  type Fix,
  type LatLng,
  PRESENCE_REFETCH_DEBOUNCE_MS,
  REPORT_MIN_DISTANCE_M,
  REPORT_MIN_INTERVAL_MS,
  shouldReport,
  STALE_AFTER_MS,
  toRoutePayload,
} from './location-plan';
import { useRoomEvents } from './room-channel';
import { supabase } from './supabase';

export type Presence = Tables<'live_presence'>;

/**
 * Rooms where the user turned sharing on during this app run. It lives in memory only, so a cold
 * start forgets it: consent is OFF again after an app restart (safe default for the open §92 policy).
 */
const consentedThisRun = new Set<string>();

// RPCs (migration 0020) ------------------------------------------------------

export async function setLocationAllowed(roomId: string, allowed: boolean) {
  const { error } = await supabase.rpc('set_location_allowed', { p_room_id: roomId, p_allowed: allowed });
  if (error) throw error;
}

export async function setActivityState(roomId: string, state: 'active' | 'ended') {
  const { error } = await supabase.rpc('set_activity_state', { p_room_id: roomId, p_state: state });
  if (error) throw error;
}

export async function setShareLocation(roomId: string, share: boolean) {
  // Mark consent before the RPC: its realtime notice can reach useMyShare.reload before the RPC
  // resolves, and an unmarked server `true` would be switched off again.
  if (share) consentedThisRun.add(roomId);
  else consentedThisRun.delete(roomId);
  const { error } = await supabase.rpc('set_share_location', { p_room_id: roomId, p_share: share });
  if (error) {
    if (share) consentedThisRun.delete(roomId);
    throw error;
  }
}

export async function saveRoute(roomId: string, points: LatLng[]) {
  const { error } = await supabase.rpc('set_route', { p_room_id: roomId, p_route: toRoutePayload(points) });
  if (error) throw error;
}

/**
 * Clears the caller's opt-in and position in every room (L1). Called before sign-out and when the
 * device permission is lost. Best effort: a failure never blocks sign-out.
 */
export async function stopMyLocation() {
  consentedThisRun.clear();
  try {
    const { error } = await supabase.rpc('stop_my_location');
    if (error) console.warn('stop_my_location failed', error.message);
  } catch (e) {
    console.warn('stop_my_location failed', e);
  }
}

export async function hasForegroundPermission() {
  const { granted } = await Location.getForegroundPermissionsAsync();
  return granted;
}

/** Asks for When In Use permission only. Returns whether it is granted. */
export async function requestForegroundPermission() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

// The member's own opt-in --------------------------------------------------------

async function fetchMyShare(roomId: string, userId: string) {
  const { data, error } = await supabase
    .from('room_members')
    .select('share_location')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();
  return error ? null : !!data?.share_location;
}

/**
 * The current user's share_location for a room. A server value of true that this app run did not
 * set (e.g. after a restart) is turned off rather than resumed silently.
 */
export function useMyShare(roomId: string, userId: string | undefined) {
  const [share, setShare] = useState(false);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!userId) return;
    const mine = ++seq.current;
    let server: boolean | null;
    try {
      server = await fetchMyShare(roomId, userId);
    } catch {
      server = null;
    }
    if (server === null || mine !== seq.current) return;
    if (server && !consentedThisRun.has(roomId)) {
      setShare(false);
      setShareLocation(roomId, false).catch(() => {});
      return;
    }
    if (!server) consentedThisRun.delete(roomId);
    setShare(server);
  }, [roomId, userId]);

  useRoomEvents(
    roomId,
    (event) => {
      if (event.table === 'room_members' || event.table === 'rooms') reload();
    },
    (status) => {
      if (status === 'SUBSCRIBED') reload();
    },
  );

  useEffect(() => {
    // False positive: reload only sets state after its first await (the compiler loses that here).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  return { share, setShareLocal: setShare, reload };
}

// Reporting -------------------------------------------------------------------

export type ReporterState = 'off' | 'starting' | 'sharing' | 'no-permission' | 'error';

/**
 * Sends this device's position while `enabled` and the app is in the foreground (no background
 * location: the app has no UIBackgroundModes location). Throttled by shouldReport (L4).
 * When the server refuses a report (the room, activity or opt-in changed) it calls `onRefused`.
 * When the device permission is gone it calls stopMyLocation (L1) and `onPermissionLost`.
 */
export function useLocationReporter({
  roomId,
  enabled,
  onRefused,
  onPermissionLost,
}: {
  roomId: string;
  enabled: boolean;
  onRefused: () => void;
  onPermissionLost: () => void;
}): ReporterState {
  const [state, setState] = useState<ReporterState>('off');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const callbacks = useRef({ onRefused, onPermissionLost });
  useEffect(() => {
    callbacks.current = { onRefused, onPermissionLost };
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => setAppActive(next === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !appActive) return;
    let cancelled = false;
    let watch: Location.LocationSubscription | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let lastSent: Fix | null = null;
    let lastFix:
      | (LatLng & { speed: number | null; accuracy: number | null; heading: number | null; receivedMs: number })
      | null = null;
    let inFlight = false;

    const stop = () => {
      cancelled = true;
      watch?.remove();
      watch = null;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
    };

    const permissionLost = async () => {
      stop();
      setState('no-permission');
      await stopMyLocation();
      callbacks.current.onPermissionLost();
    };

    const send = async () => {
      if (cancelled || inFlight || !lastFix) return;
      const now = Date.now();
      // GPS stopped delivering: do not keep a frozen fix looking fresh to others (C5).
      if (now - lastFix.receivedMs > STALE_AFTER_MS) return;
      if (!shouldReport(lastSent, lastFix, now)) return;
      inFlight = true;
      const fix = lastFix;
      try {
        const { data, error } = await supabase.rpc('report_location', {
          p_room_id: roomId,
          p_lat: fix.latitude,
          p_lng: fix.longitude,
          p_speed: fix.speed ?? undefined,
          p_accuracy: fix.accuracy ?? undefined,
          p_heading: fix.heading ?? undefined,
        });
        if (cancelled) return;
        if (error) {
          setState('error');
          return;
        }
        if (data === false) {
          stop();
          setState('off');
          callbacks.current.onRefused();
          return;
        }
        lastSent = { latitude: fix.latitude, longitude: fix.longitude, atMs: now };
        setState('sharing');
      } catch {
        // A thrown rejection (network) is reported like a returned error (C3).
        if (!cancelled) setState('error');
      } finally {
        inFlight = false;
      }
    };

    (async () => {
      setState('starting');
      if (!(await hasForegroundPermission())) {
        if (!cancelled) await permissionLost();
        return;
      }
      if (cancelled) return;
      try {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: REPORT_MIN_INTERVAL_MS,
            distanceInterval: REPORT_MIN_DISTANCE_M,
          },
          (loc) => {
            const { latitude, longitude, speed, accuracy, heading } = loc.coords;
            lastFix = { latitude, longitude, speed, accuracy, heading, receivedMs: Date.now() };
            send();
          },
          () => {
            // iOS reports an error when the permission is revoked while watching.
            hasForegroundPermission().then((ok) => {
              if (!ok && !cancelled) permissionLost();
            });
          },
        );
        if (cancelled) {
          sub.remove();
          return;
        }
        watch = sub;
        // A member standing still gets no new fixes; re-send the last one so they do not look stale.
        heartbeat = setInterval(send, REPORT_MIN_INTERVAL_MS);
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return stop;
  }, [roomId, enabled, appActive]);

  // While stopped, the last running state is stale; report 'off' without a state update.
  return enabled && appActive ? state : 'off';
}

// Viewing ---------------------------------------------------------------------

/**
 * Live positions in the room (RLS returns rows only while the activity is running with location
 * allowed). Every report sends a change notice, so refetches are debounced.
 */
const EMPTY_PRESENCE: Presence[] = [];

export function useLivePresence(roomId: string, enabled: boolean) {
  const [rows, setRows] = useState<Presence[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const mine = ++seq.current;
    const { data, error } = await supabase.from('live_presence').select('*').eq('room_id', roomId);
    if (!error && mine === seq.current) setRows(data ?? []);
  }, [roomId, enabled]);

  const schedule = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      reload();
    }, PRESENCE_REFETCH_DEBOUNCE_MS);
  }, [reload]);

  useRoomEvents(
    roomId,
    (event) => {
      if (event.table === 'live_presence') schedule();
      else if (event.table === 'rooms' || event.table === 'room_members') reload();
    },
    (status) => {
      if (status === 'SUBSCRIBED') reload();
    },
  );

  useEffect(() => {
    reload();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') reload();
    });
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [reload]);

  // Rows fetched while enabled are never shown once viewing is off.
  return { rows: enabled ? rows : EMPTY_PRESENCE, reload };
}
