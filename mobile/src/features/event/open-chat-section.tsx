// Spec 11 D: the Open chat section for Rooms. Lists open public rooms (list_open_rooms) and joins one without a code
// (join_open_room). Renders nothing while OPEN_ROOMS_LIVE is false (migration 0031 not live yet).
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { InkIcon } from '@/components/calendar';
import { QLabel } from '@/components/q-screen';
import { Button, Card, colors, Hint, radius } from '@/components/ui';
import { en } from '@/i18n/en';
import { errorMessage } from '@/lib/errors';
import { RoomError } from '@/lib/rooms';

import { cameToForeground, iconEmoji, joinableOpenRooms, OPEN_ROOMS_LIVE, openChatView, openRowSpoken, openRowWhen } from './open-room-plan';
import { joinOpenRoom, listOpenRooms, type OpenRoom } from './open-rooms-api';

/** "today 6:30 AM", "tomorrow 6:30 AM", "Sat 6:30 AM"; the end time reads "until …" (no start time yet). */
function rowWhen(room: OpenRoom, now: Date) {
  const { kind, at, day } = openRowWhen(room, now);
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = day ? en.openChat[day] : at.toLocaleDateString([], { weekday: 'short' });
  const when = `${date} ${time}`;
  return kind === 'until' ? en.openChat.until(when) : when;
}

/**
 * `refreshKey`: Rooms bumps it on pull to refresh; each change re-reads the list (BUG-OC1).
 * `onNotice` (UX P1-6): a join that fails once (full, closed) is a snackbar on Rooms, not a red line that stays.
 * `roomsOffline` (UX2-26): Rooms already shows its offline error, so this section's load error is hidden; otherwise
 * it is pattern E (red line + "Try again", busy until the read answers).
 */
export function OpenChatSection({
  refreshKey = 0,
  onNotice,
  roomsOffline = false,
  empty,
}: {
  refreshKey?: number;
  onNotice: (text: string) => void;
  roomsOffline?: boolean;
  /** Explore only (E1): shown in place of nothing once the first read has no rows and no error. */
  empty?: ReactNode;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(() => {
    let live = true;
    listOpenRooms()
      .then((rows) => {
        if (!live) return;
        setRooms(joinableOpenRooms(rows));
        setError(null);
      })
      .catch(() => live && setError(en.openChat.loadFailed))
      .finally(() => live && setRetrying(false));
    return () => {
      live = false;
    };
  }, []);

  // Re-read each time Rooms comes into view, so counts and newly opened rooms stay current.
  useFocusEffect(useCallback(() => (OPEN_ROOMS_LIVE ? load() : undefined), [load]));
  // BUG-OC1: also on Rooms pull to refresh (key 0 is the first render, which the focus read covers) and on return to
  // the foreground.
  useEffect(() => (OPEN_ROOMS_LIVE && refreshKey > 0 ? load() : undefined), [load, refreshKey]);
  useEffect(() => {
    if (!OPEN_ROOMS_LIVE) return;
    let state: string = AppState.currentState ?? 'active';
    let stop: (() => void) | undefined;
    const sub = AppState.addEventListener('change', (next) => {
      if (cameToForeground(state, next)) {
        stop?.();
        stop = load();
      }
      state = next;
    });
    return () => {
      sub.remove();
      stop?.();
    };
  }, [load]);

  async function open(room: OpenRoom) {
    if (room.already_member) {
      router.push({ pathname: '/room/[id]', params: { id: room.room_id } });
      return;
    }
    setJoining(room.room_id);
    setError(null);
    try {
      const id = await joinOpenRoom(room.room_id);
      router.push({ pathname: '/room/[id]', params: { id } });
    } catch (e) {
      // UX P1-6: the room leaves the list and a snackbar says why; the re-read keeps the rest current.
      const full = e instanceof RoomError && e.kind === 'full';
      const gone = e instanceof Error && e.message === en.openChat.gone;
      if (full || gone) {
        setRooms((rows) => rows?.filter((r) => r.room_id !== room.room_id) ?? rows);
        onNotice(full ? en.openChat.filledUp(room.name) : en.openChat.closedNow(room.name));
      } else {
        onNotice(errorMessage(e));
      }
      load();
    } finally {
      setJoining(null);
    }
  }

  // UX2-58: the section (label included) hides while it has no rows, unless it has a load error to show.
  const view = openChatView(OPEN_ROOMS_LIVE, rooms, error, roomsOffline, empty !== undefined);
  if (view === 'empty') return <>{empty}</>;
  if (view === 'none') return null;
  const showError = error !== null && !roomsOffline;
  return (
    <View style={styles.section}>
      <QLabel>{en.openChat.section}</QLabel>
      {showError ? (
        <>
          <Hint tone="error">{error}</Hint>
          <Button
            title={en.errors.tryAgain}
            variant="secondary"
            busy={retrying}
            onPress={() => {
              setRetrying(true);
              load();
            }}
          />
        </>
      ) : null}
      {/* V2: one Card for the section; rows sit inside it (no own border), split by its inset wash line. */}
      {rooms?.length ? (
        <Card>
      {rooms.map((room) => (
        <Pressable
          key={room.room_id}
          accessibilityRole="button"
          accessibilityLabel={openRowSpoken(room.name, room.public_location)}
          accessibilityValue={{ text: `${rowWhen(room, new Date())}, ${en.openChat.count(room.member_count, room.max_members)}` }}
          accessibilityHint={room.already_member ? undefined : en.openChat.joinHint}
          accessibilityState={{ busy: joining === room.room_id }}
          disabled={joining !== null}
          onPress={() => open(room)}
          // UX2-113: the other rows go to 50% while one joins.
          style={[styles.row, joining !== null && joining !== room.room_id && styles.dimmed]}
        >
          <View style={styles.tile}>
            <InkIcon emoji={iconEmoji(room.public_icon)} size={22} />
          </View>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>
              {room.name}
            </Text>
            <Text style={styles.area} numberOfLines={1}>
              {`${room.public_location} · ${rowWhen(room, new Date())}`}
            </Text>
          </View>
          {joining === room.room_id ? (
            <ActivityIndicator size="small" color={colors.ink2} />
          ) : (
            <Text style={styles.count}>
              {room.already_member ? en.openChat.joined : en.openChat.count(room.member_count, room.max_members)}
            </Text>
          )}
        </Pressable>
      ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // V2: the same 48 pt wash art tile (radius 14) as the Rooms rows.
  tile: {
    width: 48,
    height: 48,
    borderRadius: radius.tile,
    borderCurve: 'continuous',
    backgroundColor: colors.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, color: colors.label },
  area: { fontSize: 13, color: colors.ink2 },
  count: { fontSize: 14, color: colors.ink2, fontVariant: ['tabular-nums'] },
  dimmed: { opacity: 0.5 },
});
