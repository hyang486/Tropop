import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

import { colors, radius } from '@/components/ui';
import { en } from '@/i18n/en';
import { useRoomActivity } from '@/lib/activity';
import { emergencyLocation } from '@/lib/chat-plan';
import { createAnnouncer, emergencyBarMode, seenSummary } from '@/lib/emergency-plan';
import { useAuth } from '@/lib/auth';
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
export function EmergencyAlerts({
  roomId,
  activity,
  userId,
  names,
  presence,
  onOpenLocation,
  place = 'other',
}: {
  /** UX P0-1: chat shows the pinned bar until "I see it"; other screens show the 44 pt line. */
  place?: 'chat' | 'other';
  roomId: string;
  activity: ReturnType<typeof useRoomActivity>;
  userId: string | undefined;
  names: Map<string, string>;
  /** Live position rows of the room (Q 04.03 "Last location shared · 4 min ago"). */
  presence: readonly Presence[];
  /** Map moves its own camera; elsewhere the link opens Map centered on the sender. */
  onOpenLocation?: (userId: string, coordinates: LatLng) => void;
}) {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
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
  const lastSeen = useMemo(() => new Map(presence.map((p) => [p.user_id, p])), [presence]);
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

  if (!userId || activity.loading || activity.emergencies.length === 0) return null;

  // Recipients are the current members other than the sender.
  const recipients = Math.max(0, names.size - 1);

  function openLocation(senderId: string, coordinates: LatLng) {
    if (onOpenLocation) onOpenLocation(senderId, coordinates);
    else router.push({ pathname: '/room/[id]/map', params: { id: roomId, focus: senderId } });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ maxHeight: Math.round(windowHeight * EMERGENCY_MAX_HEIGHT_SHARE), flexGrow: 0 }}
      contentContainerStyle={styles.alerts}
      contentInsetAdjustmentBehavior="never"
      alwaysBounceVertical={false}
      nestedScrollEnabled
      // When the cards overflow the box, show the indicator so it is clear the actions are below.
      onContentSizeChange={(_w, h) => {
        if (h > windowHeight * EMERGENCY_MAX_HEIGHT_SHARE) scrollRef.current?.flashScrollIndicators();
      }}
    >
      {activity.emergencies.map((e) => {
        const mine = e.userId === userId;
        const { who, seen } = seenSummary(e.ackedBy, names);
        const iAcked = e.ackedBy.has(userId);
        const location = emergencyLocation(lastSeen.get(e.userId));
        const name = names.get(e.userId) ?? en.chat.formerMember;
        const title = mine ? en.activity.helpRequested : en.activity.emergencyFrom(name);
        const seenText = seen === 0 ? en.activity.noneSeen : en.activity.seenCount(seen, recipients);
        const meta = `${timeOf(e.createdAt)} · ${seenText}`;
        const mode = emergencyBarMode({ place, mine, acked: iAcked, expanded: expanded.has(e.id) });
        const collapsible = emergencyBarMode({ place, mine, acked: iAcked, expanded: false }) === 'line';

        if (mode === 'line') {
          // UX P0-1: after "I see it" (and on Map, Photos, Info) a 44 pt line; "Open" expands the bar.
          return (
            <Pressable
              key={e.id}
              style={({ pressed }) => [styles.line, pressed && { opacity: 0.6 }]}
              onPress={() => toggle(e.id, true)}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${meta}`}
              accessibilityHint={en.activity.openEmergency}
            >
              <View style={[styles.ring, styles.ringSmall]}>
                <SymbolView name="exclamationmark.triangle" size={12} tintColor={colors.danger} />
              </View>
              <Text style={styles.lineText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                {mine ? en.activity.emergencyLineMine : en.activity.emergencyLine(name)}
              </Text>
              <Text style={styles.lineOpen} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                {en.activity.openEmergency}
              </Text>
              <SymbolView name="chevron.down" size={11} weight="semibold" tintColor={colors.label} />
            </Pressable>
          );
        }

        // Q 04.03 / UX P0-1: pinned bar with the requester, time and seen count, and one action. Who saw it
        // and the location age are read out; the text opens the last shared location when there is one.
        const canOpenLocation = !mine && location.kind === 'shared';
        const spoken = [
          title,
          `${timeOf(e.createdAt)} · ${seen === 0 ? en.activity.waitingSeen : en.activity.seenByNames(who, seen, recipients)}`,
          location.kind === 'shared' ? en.activity.lastLocation(formatAge(location.updatedAt, now)) : en.activity.noLocation,
        ].join('. ');
        return (
          <View key={e.id} style={styles.bar} accessibilityRole="alert">
            <View style={styles.ring}>
              <SymbolView name="exclamationmark.triangle" size={16} tintColor={colors.danger} />
            </View>
            <Pressable
              style={styles.barText}
              disabled={!canOpenLocation}
              onPress={canOpenLocation ? () => openLocation(e.userId, location.coordinates) : undefined}
              accessibilityRole={canOpenLocation ? 'button' : 'text'}
              accessibilityLabel={spoken}
              accessibilityHint={
                canOpenLocation ? en.activity.locationHint(formatAge(location.updatedAt, now)) : undefined
              }
            >
              <Text style={styles.barTitle} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                {title}
              </Text>
              <View style={styles.barMetaRow}>
                {canOpenLocation ? <SymbolView name="location.fill" size={11} tintColor={colors.label} /> : null}
                <Text style={styles.barMeta} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
                  {meta}
                </Text>
              </View>
            </Pressable>
            {mine ? (
              <Pill label={en.activity.imOkNow} busy={busy === 'ok'} onPress={() => run('ok', activity.clearStatus)} />
            ) : !iAcked ? (
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
        );
      })}
    </ScrollView>
  );
}

/** Live positions only while an Emergency is open (no presence traffic on screens that do not need it). */
export function useEmergencyPresence(roomId: string, activity: ReturnType<typeof useRoomActivity>) {
  return useLivePresence(roomId, activity.emergencies.length > 0).rows;
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
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const loadNames = useCallback(() => {
    listMembers(roomId)
      .then((members) => setNames(new Map(members.map((m) => [m.user_id, m.display_name]))))
      .catch(() => {});
  }, [roomId]);
  useEffect(() => {
    loadNames();
  }, [loadNames]);
  useRoomEvents(roomId, (event) => {
    if (event.table === 'room_members') loadNames();
  });
  if (activity.emergencies.length === 0) return null;
  return (
    <View style={style}>
      <EmergencyAlerts roomId={roomId} activity={activity} userId={userId} names={names} presence={presence} />
    </View>
  );
}

/** UX P0-1: the bar's one action, an ink pill 36 pt tall inside a 44 pt hit area ("I see it", "I'm OK now"). */
function Pill({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!busy, busy: !!busy }}
      disabled={busy}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.pill, (pressed || busy) && { opacity: 0.5 }]}
    >
      <Text style={styles.pillText} numberOfLines={1} maxFontSizeMultiplier={EMERGENCY_FONT_CAP}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alerts: { gap: 8 },
  // UX P0-1: white (paper) fill, 1.5 pt ink border, 12 pt radius; only the icon ring is red (A17).
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.label,
    borderRadius: 12,
    borderCurve: 'continuous',
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
  barTitle: { fontSize: 16, fontWeight: '600', color: colors.label },
  barMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barMeta: { flexShrink: 1, fontSize: 13, color: colors.label },
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
  lineOpen: { fontSize: 15, fontWeight: '600', color: colors.label },
});
