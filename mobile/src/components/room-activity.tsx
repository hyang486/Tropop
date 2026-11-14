import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  Vibration,
  View,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { EnterView } from '@/components/enter-view';
import { colors, radius, useLift } from '@/components/ui';
import { en } from '@/i18n/en';
import { useRoomActivity } from '@/lib/activity';
import { emergencyLocation } from '@/lib/chat-plan';
import { createAnnouncer, emergencyAreaMode, locationLineState, onWayLine, spokenSeparators, emergencySender, emergencyBarMode, emergenciesFolded, seenPart, spokenSentence } from '@/lib/emergency-plan';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/lib/auth';
import { errorKind } from '@/lib/error-kind';
import { errorMessage } from '@/lib/errors';
import { type Presence, useLivePresence } from '@/lib/location';
import { formatAge, type LatLng } from '@/lib/location-plan';
import { useRoomEvents } from '@/lib/room-channel';
import { listMembers } from '@/lib/rooms';
import { useNow } from '@/lib/use-now';

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * F2 (U5): at the largest text sizes the Emergency card must not push its own actions, the chat composer or
 * the Photos footer off screen. Its text scales only so far, and the cards scroll inside a box at most this
 * share of the window tall. At standard size the cards fit, so nothing scrolls and nothing changes.
 */
const EMERGENCY_FONT_CAP = 1.4;
const EMERGENCY_MAX_HEIGHT_SHARE = 0.36;

// One vibration per Emergency across every screen that shows its banner.
const announcer = createAnnouncer();

/**
 * #1 / UX P0-1: open Emergencies as a pinned bar or a 44 pt line on chat, Map, Photos and Info. "I see it" and
 * "I'm OK" call the same RPCs everywhere (ack_emergency, clear_my_status). Vibrates once per new Emergency
 * raised by someone else, app-wide, while any of these screens is open.
 */
/** V3 P1: the lift shadow's reach below and beside a card (0 8 24), kept inside the alerts ScrollView. */
const SHADOW_ROOM = { side: 16, bottom: 24 } as const;

export function EmergencyAlerts({
  roomId,
  activity,
  userId,
  names,
  presence,
  onOpenLocation,
  place = 'other',
}: {
  /** UX P0-1: chat shows the pinned bar until "I see it"; other screens show the 44 pt line. V4: Map's line is a
   *  48 pt redwash capsule (the map screen places it 16 pt from the sides). */
  place?: 'chat' | 'other' | 'map';
  roomId: string;
  activity: ReturnType<typeof useRoomActivity>;
  userId: string | undefined;
  /** UX2-79: null while the member list is not known yet or failed to load. */
  names: Map<string, string> | null;
  /**
   * Live position rows of the room (Q 04.03 "Last location shared · 4 min ago"), or the whole useLivePresence
   * result so the location line can tell "not loaded" and "failed" from "none" (C39). Bare rows count as loaded.
   */
  presence: readonly Presence[] | PresenceState;
  /** Map moves its own camera; elsewhere the link opens Map centered on the sender. */
  onOpenLocation?: (userId: string, coordinates: LatLng) => void;
}) {
  const router = useRouter();
  const lift = useLift();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const now = useNow(15_000);
  const [busy, setBusy] = useState<string | null>(null);
  // Lines this screen expanded with "Open" (UX P0-1); local to the screen.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string, open: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  // UX2-30: the folded "N Emergencies" line was opened with Show.
  const [shownAll, setShownAll] = useState(false);
  const pres: PresenceState = isPresenceRows(presence) ? { rows: presence, loaded: true, error: false } : presence;
  const rows = pres.rows;
  const lastSeen = useMemo(() => new Map(rows.map((p) => [p.user_id, p])), [rows]);
  // C39: the line stays blank for the first 1 s of an unknown read (no flicker on fast reads), then says Checking.
  const presenceWaiting = activity.emergencies.length > 0 && !pres.loaded && !pres.error;
  const [presenceLate, setPresenceLate] = useState(false);
  useEffect(() => {
    if (!presenceWaiting) return;
    const t = setTimeout(() => setPresenceLate(true), 1000);
    return () => clearTimeout(t);
  }, [presenceWaiting]);
  const [presenceRetrying, setPresenceRetrying] = useState(false);
  const presenceReload = pres.reload;
  async function retryPresence() {
    if (!presenceReload || presenceRetrying) return;
    setPresenceRetrying(true);
    try {
      await presenceReload();
    } finally {
      setPresenceRetrying(false);
    }
  }
  const seeded = useRef(false);
  useEffect(() => {
    if (activity.loading) return;
    const others = activity.emergencies.filter((e) => e.userId !== userId).map((e) => e.id);
    if (!seeded.current) {
      // First load of this screen: open Emergencies are shown, not re-announced.
      seeded.current = true;
      announcer.seed(others);
      return;
    }
    if (announcer.fresh(others).length > 0) Vibration.vibrate([0, 400, 200, 400]);
  }, [activity.loading, activity.emergencies, userId]);

  // "On my way" spec: the sender hears each new responder once (VoiceOver + success haptic); seeded on first sight.
  const heardOnWay = useRef(new Map<string, Set<string>>());
  useEffect(() => {
    if (activity.loading || !userId) return;
    for (const e of activity.emergencies) {
      if (e.userId !== userId) continue;
      const heard = heardOnWay.current.get(e.id);
      if (!heard) {
        heardOnWay.current.set(e.id, new Set(e.onWay));
        continue;
      }
      for (const id of e.onWay) {
        if (heard.has(id)) continue;
        heard.add(id);
        const who = names?.get(id);
        if (who) AccessibilityInfo.announceForAccessibility(en.activity.onWayNames([who]));
        haptics.success();
      }
    }
  }, [activity.loading, activity.emergencies, userId, names]);

  // Inline failure under the action row (spec: no Alert), keyed by event; retry repeats the same answer.
  const [onWayFailed, setOnWayFailed] = useState<{ id: string; on: boolean } | null>(null);
  async function answerOnWay(eventId: string, on: boolean) {
    setBusy(`way:${eventId}`);
    setOnWayFailed(null);
    try {
      await activity.setOnWay(eventId, on);
      haptics.success();
      if (on) toggle(eventId, false);
    } catch {
      setOnWayFailed({ id: eventId, on });
    } finally {
      setBusy(null);
    }
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      Alert.alert(en.activity.actionFailed, errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const area = emergencyAreaMode({
    loading: activity.loading,
    error: activity.error,
    count: activity.emergencies.length,
    stale: activity.stale,
    slow: activity.slow,
  });
  if (!userId || area === 'none') return null;
  if (area === 'checking') return <CheckingRow />;

  const folded = emergenciesFolded({ place, count: activity.emergencies.length, shown: shownAll });

  function openLocation(senderId: string, coordinates: LatLng) {
    if (onOpenLocation) onOpenLocation(senderId, coordinates);
    else router.push({ pathname: '/room/[id]/map', params: { id: roomId, focus: senderId } });
  }

  return (
    <ScrollView
      ref={scrollRef}
      // V3 P1: room for the card's lift shadow (0 8 24) inside the scroll bounds, so the ScrollView doesn't clip it into
      // a square block at the corners; the negative margin cancels the padding, so the cards keep their place and size.
      style={{
        maxHeight: Math.round(windowHeight * EMERGENCY_MAX_HEIGHT_SHARE) + SHADOW_ROOM.bottom,
        flexGrow: 0,
        backgroundColor: 'transparent',
        marginHorizontal: -SHADOW_ROOM.side,
        marginBottom: -SHADOW_ROOM.bottom,
      }}
      contentContainerStyle={[styles.alerts, styles.shadowRoom]}
      contentInsetAdjustmentBehavior="never"
      alwaysBounceVertical={false}
      nestedScrollEnabled
      // When the cards overflow the box, show the indicator so it is clear the actions are below.
      onContentSizeChange={(_w, h) => {
        if (h - SHADOW_ROOM.bottom > windowHeight * EMERGENCY_MAX_HEIGHT_SHARE) scrollRef.current?.flashScrollIndicators();
      }}
    >
      {area === 'failed' ? (
        <ReadFailedRow
          offline={activity.stale || errorKind(activity.error) === 'offline'}
          onRetry={activity.reload}
        />
      ) : null}
      {folded ? (
        <EnterView>
          <Pressable
            style={({ pressed }) => [styles.line, pressed && { opacity: 0.6 }]}
            onPress={() => setShownAll(true)}
            accessibilityRole="button"
            accessibilityLabel={en.activity.emergencyCount(activity.emergencies.length)}
            accessibilityHint={en.activity.showEmergencies}
          >
            <View style={[styles.ring, styles.ringSmall]}>
              <SymbolView name="exclamationmark.triangle" size={12} tintColor={colors.danger} />
            </View>
            <Text style={styles.lineText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
              {en.activity.emergencyCount(activity.emergencies.length)}
            </Text>
            <Text style={styles.lineOpen} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
              {en.activity.showEmergencies}
            </Text>
            <SymbolView name="chevron.down" size={11} weight="semibold" tintColor={colors.label} />
          </Pressable>
        </EnterView>
      ) : null}
      {(folded ? [] : activity.emergencies).map((e) => {
        const mine = e.userId === userId;
        const seenText = seenPart({ mine, ackedBy: e.ackedBy, names, copy: en.activity });
        const iAcked = e.ackedBy.has(userId);
        const iOnWay = e.onWay.includes(userId);
        const wayLine = onWayLine({
          userId,
          onWay: e.onWay,
          names,
          copy: { you: en.activity.onWayYou, onWayNames: en.activity.onWayNames, onWayCount: en.activity.onWayCount },
        });
        const wayBusy = busy === `way:${e.id}`;
        const wayFailed = onWayFailed?.id === e.id ? onWayFailed : null;
        const location = emergencyLocation(lastSeen.get(e.userId));
        const sender = emergencySender(names, e.userId);
        const name = sender.kind === 'name' ? sender.name : en.chat.formerMember;
        const title = mine
          ? en.activity.helpRequested
          : sender.kind === 'unknown'
            ? en.activity.emergencyFromUnknown
            : en.activity.emergencyFrom(name);
        const meta = `${timeOf(e.createdAt)} · ${seenText.visible}`;
        const mode = emergencyBarMode({ place, mine, acked: iAcked, expanded: expanded.has(e.id) });
        const collapsible = emergencyBarMode({ place, mine, acked: iAcked, expanded: false }) === 'line';

        if (mode === 'line' && place === 'map') {
          // V4: redwash capsule, 48 pt, radius 24, lift shadow: disc + "**Sora** needs help · 2 on the way" (one
          // line, tail truncation) + chevron. Tapping opens the bar, as the line does.
          return (
            <EnterView key={e.id}>
              <Pressable
                style={({ pressed }) => [styles.capsule, lift, pressed && { opacity: 0.6 }]}
                onPress={() => toggle(e.id, true)}
                accessibilityRole="button"
                accessibilityLabel={spokenSentence([
                  title,
                  e.onWay.length > 0 ? en.activity.onWayCount(e.onWay.length) : '',
                  meta,
                ])}
                accessibilityHint={en.activity.openEmergency}
              >
                <View style={styles.capsuleDisc}>
                  <SymbolView name="exclamationmark" size={13} weight="bold" tintColor="#FFFFFF" />
                </View>
                <Text
                  style={styles.capsuleText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={EMERGENCY_FONT_CAP}
                >
                  {mine ? (
                    en.activity.capsuleMine
                  ) : sender.kind === 'unknown' ? (
                    en.activity.emergencyFromUnknown
                  ) : (
                    <>
                      <Text style={styles.capsuleName}>{name}</Text>
                      {en.activity.capsuleNeedsHelp}
                    </>
                  )}
                  {e.onWay.length > 0 ? en.activity.onWayLineSuffix(e.onWay.length) : ''}
                </Text>
                <SymbolView name="chevron.down" size={11} weight="semibold" tintColor={colors.label} />
              </Pressable>
            </EnterView>
          );
        }

        if (mode === 'line') {
          // UX P0-1: after "I see it" (and on Map, Photos, Info) a 44 pt line; "Open" expands the bar.
          return (
            <EnterView key={e.id}>
              <Pressable
                style={({ pressed }) => [styles.line, pressed && { opacity: 0.6 }]}
                onPress={() => toggle(e.id, true)}
                accessibilityRole="button"
                accessibilityLabel={spokenSentence([
                  title,
                  e.onWay.length > 0 ? en.activity.onWayCount(e.onWay.length) : '',
                  meta,
                ])}
                accessibilityHint={en.activity.openEmergency}
              >
                <View style={[styles.ring, styles.ringSmall]}>
                  <SymbolView name="exclamationmark.triangle" size={12} tintColor={colors.danger} />
                </View>
                <Text style={styles.lineText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                  {mine
                    ? en.activity.emergencyLineMine
                    : sender.kind === 'unknown'
                      ? en.activity.emergencyFromUnknown
                      : en.activity.emergencyLine(name)}
                  {e.onWay.length > 0 ? en.activity.onWayLineSuffix(e.onWay.length) : ''}
                </Text>
                <Text style={styles.lineOpen} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                  {en.activity.openEmergency}
                </Text>
                <SymbolView name="chevron.down" size={11} weight="semibold" tintColor={colors.label} />
              </Pressable>
            </EnterView>
          );
        }

        // Q 04.03 / UX P0-1: pinned bar with the requester, time and seen count, and one action. Who saw it
        // and the location age are read out; the text opens the last shared location when there is one.
        const canOpenLocation = !mine && location.kind === 'shared';
        const lineState = locationLineState({
          shared: location.kind === 'shared',
          loaded: pres.loaded,
          error: pres.error,
          late: presenceLate,
        });
        const spoken = spokenSentence([
          title,
          wayLine ?? '',
          timeOf(e.createdAt),
          seenText.spoken,
          location.kind === 'shared'
            ? // UX2-77c: no raw "·" for VoiceOver; your own Emergency speaks the visible wording.
              spokenSeparators(
                mine
                  ? en.activity.yourLastLocation(formatAge(location.updatedAt, now))
                  : en.activity.lastLocation(formatAge(location.updatedAt, now)),
              )
            : lineState === 'none'
              ? en.activity.noLocation
              : lineState === 'failed'
                ? en.activity.locationFailedSpoken
                : en.activity.checkingLocationSpoken,
        ]);
        const canRetry = lineState === 'failed' && !!presenceReload;
        return (
          <EnterView key={e.id}>
            <View style={[styles.bar, lift]} accessibilityRole="alert">
             <View style={styles.barRow}>
              <View style={styles.disc}>
                <SymbolView name="exclamationmark" size={18} weight="bold" tintColor="#FFFFFF" />
              </View>
              <Pressable
                style={styles.barText}
                disabled={!canOpenLocation && !canRetry}
                onPress={
                  canOpenLocation
                    ? () => openLocation(e.userId, location.coordinates)
                    : lineState === 'failed' ? () => retryPresence() : undefined
                }
                accessibilityRole={canOpenLocation || canRetry ? 'button' : 'text'}
                accessibilityLabel={spoken}
                accessibilityHint={
                  canOpenLocation
                    ? en.activity.locationHint(formatAge(location.updatedAt, now))
                    : canRetry
                      ? en.activity.locationRetryHint
                      : undefined
                }
                accessibilityState={{ busy: lineState === 'failed' && presenceRetrying }}
              >
                <Text style={styles.barTitle} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                  {title}
                </Text>
                {wayLine ? (
                  <View style={styles.wayRow}>
                    <SymbolView name="figure.walk" size={13} tintColor={colors.label} />
                    <Text style={styles.wayText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                      {wayLine}
                    </Text>
                  </View>
                ) : null}
                {/* UX2-77: up to 2 lines ("2:32 AM · No one saw it…" no longer cut); the pill stays centered (bar). */}
                <Text style={styles.barMeta} numberOfLines={2} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                  {meta}
                </Text>
                {/* C37 (UX2-126): the location line, so "no location" is told apart from "not loaded". */}
                {/* C39: busy while the presence retry runs, dimmed so the line keeps its height. */}
                <View style={[styles.barLocationRow, presenceRetrying && lineState === 'failed' && { opacity: 0.5 }]}>
                  {canOpenLocation ? <SymbolView name="location.fill" size={11} tintColor={colors.label} /> : null}
                  <Text
                    style={[styles.barLocation, canOpenLocation && [styles.barLocationOpen, styles.barLocationLink]]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={EMERGENCY_FONT_CAP}
                  >
                    {location.kind === 'shared' ? (
                      mine ? (
                        en.activity.yourLastLocation(formatAge(location.updatedAt, now))
                      ) : (
                        en.activity.openLastLocationAge(formatAge(location.updatedAt, now))
                      )
                    ) : lineState === 'none' ? (
                      en.activity.noLocation
                    ) : lineState === 'failed' ? (
                      <>
                        {`${en.activity.locationFailed} · `}
                        {canRetry ? <Text style={styles.barLocationOpen}>{en.activity.locationRetry}</Text> : null}
                      </>
                    ) : lineState === 'blank'
                      ? ' '
                      : en.activity.checkingLocation}
                  </Text>
                </View>
              </Pressable>
              {mine ? (
                <Pill label={en.activity.imOkNow} busy={busy === 'ok'} onPress={() => run('ok', activity.clearStatus)} />
              ) : !e.onWayReady && !iAcked ? (
                // Pre-0040 server: today's single "I see it" pill.
                <Pill
                  label={en.activity.acknowledge}
                  busy={busy === `ack:${e.id}`}
                  onPress={() =>
                    run(`ack:${e.id}`, async () => {
                      await activity.acknowledge(e.id);
                      toggle(e.id, false);
                    })
                  }
                />
              ) : null}
              {collapsible ? (
                <Pressable
                  onPress={() => toggle(e.id, false)}
                  hitSlop={8}
                  style={styles.hide}
                  accessibilityRole="button"
                  accessibilityLabel={en.activity.hideEmergency}
                >
                  <SymbolView name="chevron.up" size={13} weight="semibold" tintColor={colors.label} />
                </Pressable>
              ) : null}
             </View>
              {/* "On my way" spec: members answer below the text; On my way first when the pills stack. */}
              {mine || !e.onWayReady ? null : iOnWay ? (
                <View style={styles.youRow}>
                  <SymbolView name="figure.walk" size={13} tintColor={colors.label} />
                  <Text style={styles.wayText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                    {en.activity.youOnWay}
                  </Text>
                  <Pressable
                    style={styles.cantCome}
                    disabled={wayBusy}
                    onPress={() => answerOnWay(e.id, false)}
                    accessibilityRole="button"
                    accessibilityLabel={en.activity.cantComeLabel(name)}
                    accessibilityState={{ disabled: wayBusy, busy: wayBusy }}
                  >
                    <Text style={[styles.cantComeText, wayBusy && { opacity: 0.5 }]} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                      {en.activity.cantCome}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.actions, fontScale > 1.2 && styles.actionsStacked]}>
                  {!iAcked ? (
                    <Pill
                      wide
                      variant="secondary"
                      label={en.activity.acknowledge}
                      busy={busy === `ack:${e.id}`}
                      onPress={() =>
                        run(`ack:${e.id}`, async () => {
                          await activity.acknowledge(e.id);
                          toggle(e.id, false);
                        })
                      }
                    />
                  ) : null}
                  <Pill
                    wide
                    label={en.activity.onMyWay}
                    accessibilityLabel={en.activity.onMyWayLabel(name)}
                    busy={wayBusy}
                    onPress={() => answerOnWay(e.id, true)}
                  />
                </View>
              )}
              {wayFailed ? (
                <Pressable
                  style={styles.wayError}
                  onPress={() => answerOnWay(e.id, wayFailed.on)}
                  accessibilityRole="button"
                  accessibilityLabel={en.activity.onWayFailed}
                  accessibilityHint={en.activity.onWayRetry}
                >
                  <Text style={styles.wayErrorText} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                    {`${en.activity.onWayFailed} `}
                    <Text style={styles.barLocationOpen}>{en.activity.onWayRetry}</Text>
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </EnterView>
        );
      })}
    </ScrollView>
  );
}

/** Live positions only while an Emergency is open (no presence traffic on screens that do not need it). */
export function useEmergencyPresence(roomId: string, activity: ReturnType<typeof useRoomActivity>): PresenceState {
  return useLivePresence(roomId, activity.emergencies.length > 0);
}

/** C39: the useLivePresence result EmergencyAlerts reads (UX2-85 loaded/error and the reload). */
export type PresenceState = {
  rows: readonly Presence[];
  loaded: boolean;
  error: boolean;
  reload?: () => Promise<void>;
};
function isPresenceRows(p: readonly Presence[] | PresenceState): p is readonly Presence[] {
  return Array.isArray(p);
}

/**
 * #1: the Emergency banner for screens that do not load the member list themselves (Photos, Info, Photos of
 * me). Loads the names, and reloads them on membership changes. Renders nothing when no Emergency is open.
 */
export function RoomEmergencyBanner({ roomId, style }: { roomId: string; style?: StyleProp<ViewStyle> }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  // activity_seq only scopes the Arrived button, which this banner does not show.
  const activity = useRoomActivity(roomId, userId, 0);
  const presence = useEmergencyPresence(roomId, activity);
  // UX2-79: null = not known yet. A failed reload keeps the names already known.
  const [names, setNames] = useState<Map<string, string> | null>(null);
  const [failed, setFailed] = useState(false);
  const loadNames = useCallback(() => {
    listMembers(roomId)
      .then((members) => {
        setNames(new Map(members.map((m) => [m.user_id, m.display_name])));
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [roomId]);
  useEffect(() => {
    loadNames();
  }, [loadNames]);
  // UX2-79: after a failed read, retry once after 5 s and once when the app becomes active.
  useEffect(() => {
    if (!failed) return;
    let retried = false;
    const retry = () => {
      if (retried) return;
      retried = true;
      loadNames();
    };
    const timer = setTimeout(retry, 5000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retry();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [failed, loadNames]);
  useRoomEvents(roomId, (event) => {
    if (event.table === 'room_members') loadNames();
  });
  const area = emergencyAreaMode({
    loading: activity.loading,
    error: activity.error,
    count: activity.emergencies.length,
    stale: activity.stale,
    slow: activity.slow,
  });
  if (area === 'none') return null;
  return (
    <View style={style}>
      <EmergencyAlerts roomId={roomId} activity={activity} userId={userId} names={names} presence={presence} />
    </View>
  );
}

/** UX2-05 (pattern E): red cause line + one ink-outline "Try again" (36 pt inside a 44 pt hit area, busy while it runs). */
/** UX2-107: a first read that takes over 3 s; neutral, never red, so it does not read as an Emergency. */
function CheckingRow() {
  return (
    <View style={styles.checking} accessible accessibilityLabel={en.activity.checkingSpoken}>
      <ActivityIndicator size="small" color={colors.ink2} />
      <Text style={styles.checkingText} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
        {en.activity.checking}
      </Text>
    </View>
  );
}

function ReadFailedRow({ onRetry, offline }: { onRetry: () => Promise<void>; offline: boolean }) {
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.failed} accessibilityLiveRegion="polite">
      <Text style={styles.failedText} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
        {offline ? en.activity.offlineStale : en.activity.readFailed}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={en.activity.readRetry}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={retry}
        hitSlop={4}
        style={({ pressed }) => [styles.failedButton, (pressed || busy) && { opacity: 0.5 }]}
      >
        <Text style={styles.failedButtonText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
          {en.activity.readRetry}
        </Text>
      </Pressable>
    </View>
  );
}

/** UX P0-1: the bar's one action, an ink pill 36 pt tall inside a 44 pt hit area ("I see it", "I'm OK now"). */
// "On my way" spec: `wide` is the members' 44 pt answer pill (flex 1, 17 semibold); secondary is the 1.5 ink outline.
function Pill({
  label,
  onPress,
  busy,
  wide,
  variant = 'primary',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  wide?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!busy, busy: !!busy }}
      disabled={busy}
      onPress={onPress}
      hitSlop={wide ? 0 : 4}
      style={({ pressed }) => [
        styles.pill,
        wide && styles.pillWide,
        variant === 'secondary' && styles.pillSecondary,
        (pressed || busy) && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[styles.pillText, wide && styles.pillTextWide, variant === 'secondary' && { color: colors.label }]}
        numberOfLines={1}
        maxFontSizeMultiplier={EMERGENCY_FONT_CAP}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alerts: { gap: 8 },
  shadowRoom: { paddingHorizontal: SHADOW_ROOM.side, paddingBottom: SHADOW_ROOM.bottom },
  // V3: the Emergency card is redwash, radius 22, with the lift shadow (inline); no frame (was a 2 pt ink border).
  bar: {
    minHeight: 60,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 10,
    backgroundColor: colors.redwash,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  // V3: a 40 pt solid danger disc with a white "!" and a 6 pt danger halo at 20%.
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 6,
    backgroundColor: colors.danger,
    boxShadow: '0 0 0 6px rgba(255, 59, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSmall: { width: 24, height: 24, borderRadius: 12 },
  barText: { flex: 1, gap: 1 },
  barTitle: { fontSize: 17, fontWeight: '600', color: colors.label },
  barMeta: { flexShrink: 1, fontSize: 13, color: colors.label },
  barLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLocation: { flexShrink: 1, fontSize: 13, color: colors.ink2 },
  barLocationOpen: { fontWeight: '600', color: colors.label },
  // V3: "Open last location · 2 min ago" is underlined.
  barLocationLink: { textDecorationLine: 'underline' },
  pill: {
    flexShrink: 0,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.tint,
  },
  pillText: { fontSize: 15, fontWeight: '600', color: colors.onTint },
  pillWide: { flex: 1, minHeight: 44, alignItems: 'center', borderRadius: 22 },
  // V3: "I see it" is a lift fill with an ink label (no outline); "On my way" stays the ink fill.
  pillSecondary: { backgroundColor: colors.lift },
  pillTextWide: { fontSize: 17 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wayText: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: colors.label },
  // The members' answer row sits 12 below the text; stacked at large text with On my way on top.
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, marginRight: 4 },
  actionsStacked: { flexDirection: 'column-reverse' },
  youRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  cantCome: { marginLeft: 'auto', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  cantComeText: { fontSize: 15, color: colors.label, textDecorationLine: 'underline' },
  wayError: { minHeight: 44, justifyContent: 'center' },
  wayErrorText: { fontSize: 13, color: colors.danger },
  hide: { width: 28, height: 44, alignItems: 'center', justifyContent: 'center' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.label,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  lineText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.label },
  // V4 Map capsule (no outline): redwash, 48 pt, full pill, a 24 pt danger disc.
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 16,
    backgroundColor: colors.redwash,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  capsuleDisc: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleText: { flex: 1, fontSize: 15, color: colors.label },
  capsuleName: { fontWeight: '700' },
  lineOpen: { fontSize: 15, fontWeight: '600', color: colors.label },
  checking: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  checkingText: { flex: 1, fontSize: 13, color: colors.ink2 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12 },
  failedText: { flex: 1, fontSize: 15, color: colors.errorText },
  failedButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.label,
  },
  failedButtonText: { fontSize: 15, fontWeight: '600', color: colors.label },
});
