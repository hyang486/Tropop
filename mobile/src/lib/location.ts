import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { Tables } from './database.types';
import {
  type Fix,
  type LatLng,
  PRESENCE_REFETCH_DEBOUNCE_MS,
  REPORT_MIN_DISTANCE_M,
  REPORT_MIN_INTERVAL_MS,
  reconcileShare,
  shouldReport,
  STALE_AFTER_MS,
  toRoutePayload,
} from './location-plan';
import { useRoomEvents } from './room-channel';
import { supabase } from './supabase';

export type Presence = Tables<'live_presence'>;

// Sharing store ----------------------------------------------------------------

export type ReporterState = 'off' | 'starting' | 'sharing' | 'no-permission' | 'error';
/** What the map shows for the user's own sharing in a room. 'refused': the server stopped it. */
export type SharingState = ReporterState | 'refused';

/**
 * `rooms`: where the user turned sharing on during this app run. It lives in memory only, so a cold
 * start forgets it: consent is OFF again after an app restart (safe default for the open §92 policy).
 * The app-level LocationReporters runs one reporter per room in it, so sharing continues while the
 * user is in chat or another screen (M2). `states`: each room's last reporter state.
 */
type SharingSnapshot = { rooms: ReadonlySet<string>; states: ReadonlyMap<string, SharingState> };

let sharing: SharingSnapshot = { rooms: new Set(), states: new Map() };

/**
 * M7: `pending` counts set_share_location calls in flight per room; `gens` moves whenever a room's
 * consent changes or such a call settles. A share read compares them (reconcileShare) so an
 * overlapping read cannot undo an opt-in. Every change notifies, and useMyShare reads again.
 */
const pending = new Map<string, number>();
const gens = new Map<string, number>();
let globalGen = 0;

function consentGen(roomId: string) {
  return globalGen * 1_000_000 + (gens.get(roomId) ?? 0);
}

function bumpGen(roomId: string) {
  gens.set(roomId, (gens.get(roomId) ?? 0) + 1);
}
const sharingListeners = new Set<() => void>();

function emitSharing(next: SharingSnapshot) {
  sharing = next;
  sharingListeners.forEach((listener) => listener());
}

function subscribeSharing(listener: () => void) {
  sharingListeners.add(listener);
  return () => {
    sharingListeners.delete(listener);
  };
}

function setConsent(roomId: string, on: boolean) {
  if (sharing.rooms.has(roomId) === on) return;
  bumpGen(roomId);
  const rooms = new Set(sharing.rooms);
  let states = sharing.states;
  if (on) {
    rooms.add(roomId);
    // A new opt-in starts clean: an old 'refused' / 'no-permission' no longer applies.
    if (states.has(roomId)) {
      const next = new Map(states);
      next.delete(roomId);
      states = next;
    }
  } else rooms.delete(roomId);
  emitSharing({ rooms, states });
}

/** Called by LocationReporters when the device permission is lost while sharing in a room. */
export function dropConsent(roomId: string) {
  setConsent(roomId, false);
}

function clearConsent() {
  globalGen += 1;
  if (sharing.rooms.size > 0) emitSharing({ ...sharing, rooms: new Set() });
}

/** 'off' from a stopped reporter never hides why it stopped ('refused', 'no-permission'). */
export function setSharingState(roomId: string, state: SharingState) {
  const current = sharing.states.get(roomId);
  if (current === state) return;
  if (state === 'off' && (current === 'refused' || current === 'no-permission')) return;
  const states = new Map(sharing.states);
  states.set(roomId, state);
  emitSharing({ ...sharing, states });
}

export function useSharingRooms(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeSharing, () => sharing.rooms);
}

export function useSharingState(roomId: string): SharingState {
  return useSyncExternalStore(subscribeSharing, () => sharing.states.get(roomId) ?? 'off');
}

/** Changes whenever the room's consent changes or an opt-in call settles (M7). */
function useConsentGen(roomId: string): number {
  return useSyncExternalStore(subscribeSharing, () => consentGen(roomId));
}

/** Promise of the cold-start stop (M3); an opt-in waits for it so the stop cannot undo it. */
let launchStop: Promise<void> | null = null;

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
  if (launchStop) await launchStop;
  // Mark consent and the pending call before the RPC: a share read that overlaps it is ignored
  // (M7), and its realtime notice cannot switch an unmarked server `true` off again.
  pending.set(roomId, (pending.get(roomId) ?? 0) + 1);
  setConsent(roomId, share);
  let failed = false;
  try {
    const { error } = await supabase.rpc('set_share_location', { p_room_id: roomId, p_share: share });
    if (error) throw error;
  } catch (e) {
    failed = true;
    throw e;
  } finally {
    const left = (pending.get(roomId) ?? 1) - 1;
    if (left > 0) pending.set(roomId, left);
    else pending.delete(roomId);
    if (failed && share) setConsent(roomId, false);
    // Reads that overlapped the call are now outdated; notify so useMyShare reads again.
    bumpGen(roomId);
    emitSharing({ ...sharing });
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
  clearConsent();
  try {
    const { error } = await supabase.rpc('stop_my_location');
    if (error) console.warn('stop_my_location failed', error.message);
  } catch (e) {
    console.warn('stop_my_location failed', e);
  }
}

/**
 * M3: once per cold start with a restored session. Consent does not survive a restart, and iOS
 * usually kills the app when location access is lowered in Settings, so a share left on the server by
 * the previous run (and its last position) is cleared here.
 */
export function stopMyLocationOnLaunch() {
  launchStop ??= stopMyLocation();
  return launchStop;
}

export async function hasForegroundPermission() {
  const { granted } = await Location.getForegroundPermissionsAsync();
  return granted;
}

/**
 * The device's own position for centering the map (M6). Never prompts: null without permission.
 * Uses the cached fix when there is one, otherwise one balanced-accuracy fix.
 */
export async function getMyPosition(): Promise<LatLng | null> {
  try {
    if (!(await hasForegroundPermission())) return null;
    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
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
    const genAtStart = consentGen(roomId);
    let server: boolean | null;
    try {
      server = await fetchMyShare(roomId, userId);
    } catch {
      server = null;
    }
    if (server === null || mine !== seq.current) return;
    const decision = reconcileShare({
      server,
      consented: sharing.rooms.has(roomId),
      pending: (pending.get(roomId) ?? 0) > 0,
      genAtStart,
      genNow: consentGen(roomId),
    });
    switch (decision) {
      case 'ignore':
        return;
      case 'turn-off-server':
        setShare(false);
        setShareLocation(roomId, false).catch(() => {});
        return;
      case 'drop-consent':
        setConsent(roomId, false);
        setShare(false);
        return;
      case 'off':
        setShare(false);
        return;
      case 'on':
        setShare(true);
    }
  }, [roomId, userId]);

  // A settled opt-in or a consent change makes earlier reads outdated: read again.
  const gen = useConsentGen(roomId);
  useEffect(() => {
    // reload only sets state after its first await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [gen, reload]);

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
