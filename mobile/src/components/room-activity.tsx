import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Pressable, type StyleProp, StyleSheet, Text, Vibration, View, type ViewStyle } from 'react-native';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { useRoomActivity } from '@/lib/activity';
import { createAnnouncer, seenSummary } from '@/lib/emergency-plan';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { useRoomEvents } from '@/lib/room-channel';
import { listMembers } from '@/lib/rooms';

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// One vibration per Emergency across every screen that shows its banner.
const announcer = createAnnouncer();

/**
 * #1: open Emergencies with their actions, the same card on chat, Map, Photos and Info. "I see it" and
 * "I'm OK" call the same RPCs everywhere (ack_emergency, clear_my_status). Vibrates once per new Emergency
 * raised by someone else, app-wide, while any of these screens is open.
 */
export function EmergencyAlerts({
  activity,
  userId,
  names,
}: {
  activity: ReturnType<typeof useRoomActivity>;
  userId: string | undefined;
  names: Map<string, string>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
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

  return (
    <View style={styles.alerts}>
      {activity.emergencies.map((e) => {
        const mine = e.userId === userId;
        const { who, seen } = seenSummary(e.ackedBy, names, en.activity.aMember);
        const iAcked = e.ackedBy.has(userId);
        return (
          <View key={e.id} style={styles.emergency} accessibilityRole="alert">
            <View style={styles.flex}>
              <Text style={styles.emergencyTitle}>
                {mine ? en.activity.myEmergency : en.activity.emergencyFrom(names.get(e.userId) ?? en.chat.formerMember)}
              </Text>
              <Text style={styles.emergencyMeta}>
                {timeOf(e.createdAt)} · {en.activity.seenByNames(who, seen, recipients)}
              </Text>
            </View>
            {mine ? (
              <Chip label={en.activity.imOk} busy={busy === 'ok'} onPress={() => run('ok', activity.clearStatus)} />
            ) : iAcked ? (
              <Text style={styles.emergencyMeta}>{en.activity.acknowledged}</Text>
            ) : (
              <Chip
                label={en.activity.acknowledge}
                busy={busy === `ack:${e.id}`}
                onPress={() => run(`ack:${e.id}`, () => activity.acknowledge(e.id))}
              />
            )}
          </View>
        );
      })}
    </View>
  );
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
      <EmergencyAlerts activity={activity} userId={userId} names={names} />
    </View>
  );
}

/** Arrived button, the member's own status, and open Emergencies with acknowledgements. */
export function RoomActivityBar({
  roomId,
  activitySeq,
  userId,
  names,
}: {
  roomId: string;
  activitySeq: number;
  userId: string | undefined;
  names: Map<string, string>;
}) {
  const activity = useRoomActivity(roomId, userId, activitySeq);
  const [busy, setBusy] = useState<string | null>(null);

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

  const myStatusId = userId ? activity.memberStatus.get(userId) : undefined;
  const myStatus = activity.statuses.find((s) => s.id === myStatusId);

  function pickStatus() {
    const options = [...activity.statuses.map((s) => s.label), en.activity.clearStatus, en.room.cancel];
    const emergencyIndex = activity.statuses.findIndex((s) => s.is_emergency);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: en.activity.chooseStatus,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: emergencyIndex >= 0 ? emergencyIndex : undefined,
      },
      (index) => {
        if (index === options.length - 1) return;
        if (index === options.length - 2) {
          if (myStatusId) run('status', activity.clearStatus);
          return;
        }
        const def = activity.statuses[index];
        if (!def || def.id === myStatusId) return;
        if (def.is_emergency) {
          Alert.alert(en.activity.emergencyConfirmTitle, en.activity.emergencyConfirmBody, [
            { text: en.room.cancel, style: 'cancel' },
            { text: en.activity.sendEmergency, style: 'destructive', onPress: () => run('status', () => activity.setStatus(def.id)) },
          ]);
        } else {
          run('status', () => activity.setStatus(def.id));
        }
      },
    );
  }

  if (!userId || activity.loading) return null;

  return (
    <View style={styles.wrap}>
      <EmergencyAlerts activity={activity} userId={userId} names={names} />
      <View style={styles.row}>
        <Chip
          label={activity.myArrivedAt ? en.activity.arrivedAt(timeOf(activity.myArrivedAt)) : en.activity.arrived}
          done={!!activity.myArrivedAt}
          busy={busy === 'arrive'}
          onPress={activity.myArrivedAt ? undefined : () => run('arrive', activity.arrive)}
        />
        <Chip
          label={myStatus ? en.activity.statusValue(myStatus.label) : en.activity.status}
          danger={myStatus?.is_emergency}
          busy={busy === 'status'}
          onPress={pickStatus}
        />
      </View>
    </View>
  );
}

function Chip({
  label,
  onPress,
  busy,
  done,
  danger,
}: {
  label: string;
  onPress?: () => void;
  busy?: boolean;
  done?: boolean;
  danger?: boolean;
}) {
  const disabled = !onPress || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, (pressed || busy) && { opacity: 0.5 }]}
    >
      <Text style={[styles.chipText, done && styles.chipDone, danger && styles.chipDanger]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  alerts: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flexShrink: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
  },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.tint },
  chipDone: { color: colors.secondaryLabel },
  chipDanger: { color: colors.danger },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.field,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
  },
  emergencyTitle: { fontSize: 16, fontWeight: '700', color: colors.danger },
  emergencyMeta: { fontSize: 13, color: colors.secondaryLabel, marginTop: 2 },
});
