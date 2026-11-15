import { roomHasEnded } from '@/lib/error-kind';
import { classifySend } from '@/lib/send-room';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { confirmEmergency, isEmergencyActiveNotice, StatusPicker } from '@/components/status-picker';
import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { type StatusDefinition, useRoomActivity } from '@/lib/activity';
import { usePlanState } from '@/features/calendar/calendar-store';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { useLivePresence, useMyShare } from '@/lib/location';
import { isStale, parseRoute } from '@/lib/location-plan';
import { useRoomEvents } from '@/lib/room-channel';
import { getRoom, type Room } from '@/lib/rooms';
import { useHeaderOverlap } from '@/lib/use-header-overlap';

import { setPaceWaiting } from './connection';
import { breakRun, checkStationary, closeStationaryPrompt, feedFix, flushRun, retryFailedSaves, runKey } from './engine';
import { runStopped, targetSecPerKm, usualPace } from './pace-core';
import { reloadHistory, usePaceSettings } from './settings';
import { onCue, stopSpeech } from './voice';
const t = en.pace;

const STATIONARY_TICK_MS = 10_000;
const CUE_SHOWN_MS = 12_000;

/** Pace maker applies to running rooms: type sports with location sharing allowed. */
export function paceApplies(room: Pick<Room, 'type' | 'location_allowed'>) {
  return room.type === 'sports' && room.location_allowed;
}

/** capacity B item 4: the pace maker is Plus on the caller's own plan (user_plans). null (still loading) = not yet. */
export function paceAllowed(plus: boolean | null): boolean {
  return plus === true;
}

/**
 * The pace maker's screen layer (spec 3.4): feeds my fixes to the session, shows each cue in a banner (spoken
 * too when the build has speech) and opens the status sheet after 3 minutes standing still. Mount it once per
 * screen as the last child of a flex: 1 root; only the focused screen acts, so chat and Map can both mount it.
 */
export function PaceLayer({ roomId }: { roomId: string }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [room, setRoom] = useState<Room | null>(null);
  const load = useCallback(() => {
    getRoom(roomId)
      .then((r) => {
        setPaceWaiting(roomId, false);
        setRoom(r);
      })
      .catch(() => setPaceWaiting(roomId, true));
  }, [roomId]);
  useEffect(load, [load]);
  // UX2-118: retry on foreground and on reconnect.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        load();
        retryFailedSaves();
      }
    });
    return () => {
      sub.remove();
      setPaceWaiting(roomId, false);
    };
  }, [load, roomId]);
  useRoomEvents(
    roomId,
    (event) => {
      if (event.table === 'rooms') load();
    },
    (status) => {
      if (status === 'SUBSCRIBED') load();
    },
  );
  if (!room || !userId || !paceApplies(room)) return null;
  return <PaceRunner room={room} userId={userId} onEnded={load} />;
}

function PaceRunner({ room, userId, onEnded }: { room: Room; userId: string; onEnded: () => void }) {
  const settings = usePaceSettings(room.id);
  const my = useMyShare(room.id, userId);
  const focused = useIsFocused();
  // UX2-119: the same plan state as the card; unknown (offline) or loading = off.
  const plan = usePlanState(userId);
  const plus = plan === 'plus' ? true : plan === 'free' ? false : null;
  const running = room.activity_state === 'active' && settings.on && my.share && paceAllowed(plus);
  const live = running && focused;
  const key = runKey(room.id, room.activity_seq);
  // Only while the Map is in front: fixes feed only then, and a hidden tab would refetch every member's row on
  // each presence change for nothing (the Map's own markers keep their separate read).
  const presence = useLivePresence(room.id, live);
  const activity = useRoomActivity(room.id, userId, room.activity_seq);
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Latest inputs for the fix effect, so it runs on a new fix only.
  const inputs = useRef({ settings, presence: presence.rows, room });
  useEffect(() => {
    inputs.current = { settings, presence: presence.rows, room };
  });

  // My own row in live_presence is the reporter's latest fix (read only; its reporting rules are unchanged).
  const mine = presence.rows.find((r) => r.user_id === userId);
  const mineAt = mine?.updated_at;
  useEffect(() => {
    if (!live || !mine || !mineAt) return;
    const { settings: s, presence: rows, room: r } = inputs.current;
    const nowMs = Date.now();
    const atMs = Math.min(Date.parse(mineAt), nowMs);
    if (!Number.isFinite(atMs)) return;
    feedFix(
      key,
      { latitude: mine.lat, longitude: mine.lng, atMs, accuracyM: mine.accuracy_m },
      {
        roomId: r.id,
        userId,
        nowMs,
        targetSecPerKm: targetSecPerKm(s.target, usualPace(s.history)),
        route: parseRoute(r.route),
        place: r.place_lat != null && r.place_lng != null ? { latitude: r.place_lat, longitude: r.place_lng } : null,
        others: rows
          .filter((row) => !isStale(row.updated_at, nowMs))
          .map((row) => ({
            userId: row.user_id,
            point: { latitude: row.lat, longitude: row.lng },
            speedMps: row.speed_mps,
          })),
      },
    );
    // mine is read through mineAt: a new fix is a new updated_at.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, key, mineAt, userId]);

  useEffect(() => {
    if (!live) return;
    const startMs = room.activity_started_at ? Date.parse(room.activity_started_at) : 0;
    const timer = setInterval(() => {
      if (checkStationary(key, Date.now(), Number.isFinite(startMs) ? startMs : 0)) setPicking(true);
    }, STATIONARY_TICK_MS);
    return () => clearInterval(timer);
  }, [live, key, room.activity_started_at]);

  // Switch or sharing off with the screen open: the next fix re-anchors. Only a true -> false change seen in this
  // mount counts (share loads as false first), so re-entering the screen still bridges the gap.
  const wasRunning = useRef<boolean | null>(null);
  useEffect(() => {
    if (runStopped(wasRunning.current, running)) breakRun(key);
    wasRunning.current = running;
  }, [running, key]);

  // Save to history and stop any cue being spoken when the session stops (switch off, activity ended, sharing off,
  // screen left).
  useEffect(() => {
    if (!running) return;
    return () => {
      stopSpeech();
      flushRun(key);
      reloadHistory();
    };
  }, [running, key]);

  const myStatusId = activity.memberStatus.get(userId);
  function close() {
    setPicking(false);
    setNotice(null);
    closeStationaryPrompt(key, Date.now());
  }
  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (e) {
      // UX2-52 server guard: Emergency is still on; reopen the picker (now in its Emergency layout) and say why.
      if (isEmergencyActiveNotice(e)) {
        setNotice(errorMessage(e));
        setPicking(true);
      } else if ((await classifySend(room.id, e, room)) === 'ended') onEnded();
      else Alert.alert(en.activity.actionFailed, errorMessage(e));
    }
  }
  function pick(def: StatusDefinition) {
    close();
    if (def.id === myStatusId) return;
    run(() => activity.setStatus(def.id));
  }
  // Same rules as the chat status bar (UX2-05b): confirm first, works without the list, a failure offers Try again.
  function emergency() {
    close();
    if (activity.statuses.some((s) => s.is_emergency && s.id === myStatusId)) return;
    confirmEmergency(activity.setEmergency, undefined, {
      ended: () => roomHasEnded(room, Date.now()),
      classify: (e) => classifySend(room.id, e, room),
      onEnded,
    });
  }
  function clear() {
    close();
    if (myStatusId) run(activity.clearStatus);
  }

  return (
    <>
      {focused ? <CueBanner /> : null}
      <StatusPicker
        visible={picking && focused}
        title={t.stationaryTitle}
        cancelLabel={t.dismiss}
        statuses={activity.statuses}
        currentId={myStatusId}
        onPick={pick}
        onEmergency={emergency}
        onClear={clear}
        onClose={close}
        notice={notice}
        failed={!!activity.error}
        onRetry={activity.reload}
      />
    </>
  );
}

/** The on-screen cue: every cue shows here for a few seconds (the only cue when the build has no speech). */
function CueBanner() {
  const [cue, setCue] = useState<{ text: string; id: number } | null>(null);
  const { rootRef, onLayout, overlap } = useHeaderOverlap();
  useEffect(() => {
    let id = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = onCue((text) => {
      const mine = ++id;
      setCue({ text, id: mine });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setCue((c) => (c?.id === mine ? null : c)), CUE_SHOWN_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return (
    <View ref={rootRef} onLayout={onLayout} style={styles.overlay} pointerEvents="box-none">
      {cue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${cue.text} ${t.cueDismiss}`}
          accessibilityLiveRegion="polite"
          onPress={() => setCue(null)}
          style={[styles.banner, { marginTop: overlap + 8 }]}
        >
          <Text style={styles.bannerTitle}>{t.title}</Text>
          <Text style={styles.bannerText}>{cue.text}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, paddingHorizontal: 16 },
  banner: {
    backgroundColor: colors.lift,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  },
  bannerTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.ink2,
  },
  bannerText: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.label },
});
