import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { InkIcon } from '@/components/calendar/ink-icon';
import { EmptyState } from '@/components/empty-state';
import { placeTimeLine } from '@/components/place-time-cards';
import { QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, size, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { syncExpiryReminders, takePendingReminderRoom } from '@/lib/expiry-reminders';
import { pruneRoomCaches } from '@/lib/media';
import { placeTimeOf } from '@/lib/place-time';
import { resumePendingInvite } from '@/lib/invite';
import { formatRemaining, listMyRooms, type Room, type RoomWithCount } from '@/lib/rooms';
import { useNow } from '@/lib/use-now';
import { purgeStaleAskHistories } from '@/features/event/ask-store';
import { OpenChatSection } from '@/features/event/open-chat-section';
import { defaultRoomIcon, iconEmoji } from '@/features/event/open-room-plan';
import { Snackbar } from '@/features/event/snackbar';
import { syncSiriRooms } from '@/features/event/siri-mirror';
import { syncCalendarRooms } from '@/features/calendar/calendar-store';
import { roomListEntry } from '@/features/recap/grace-plan';
import { graceTime } from '@/features/recap/use-grace';

export default function Rooms() {
  const router = useRouter();
  const { profile, isGuest, session } = useAuth();
  const uid = session?.user.id;
  const now = useNow();
  const [rooms, setRooms] = useState<RoomWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // BUG-OC1: pull to refresh re-reads my rooms and Open chat (bumping its key).
  const [refreshing, setRefreshing] = useState(false);
  const [openChatKey, setOpenChatKey] = useState(0);
  // UX P1-6: one Open chat notice at a time; the id re-shows (and re-reads) the same text.
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const showNotice = useCallback((text: string) => setNotice((n) => ({ id: (n?.id ?? 0) + 1, text })), []);
  const hideNotice = useCallback(() => setNotice(null), []);

  const load = useCallback(async () => {
    try {
      const list = await listMyRooms();
      setRooms(list);
      setError(null);
      // Drop cached originals of rooms that ended, expired or were left since the last visit.
      pruneRoomCaches(list.map((r) => r.id));
      // Spec 10.4: Ask Qrewing history goes once a room ended (grace counts as ended), expired or was left.
      void purgeStaleAskHistories(list.filter((r) => r.deleted_at === null).map((r) => r.id));
      syncSiriRooms(list);
      // Qrewing Calendar: snapshot my rooms on this phone (kept after they end, for the month view and diary).
      syncCalendarRooms(uid, list);
      // Local 24-hour reminders for every open room; cancels those of rooms no longer listed. Rooms the host
      // ended (listed only during their grace window, spec 7) get no reminder.
      syncExpiryReminders(
        list.filter((r) => r.deleted_at === null),
        true,
      );
    } catch (e) {
      setError(`${en.home.loadFailed} ${errorMessage(e)}`);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      // An invite chosen before sign-in (code, QR or link; item 10) opens here once, right after sign-in.
      if (resumePendingInvite((invite) => router.push({ pathname: '/preview', params: invite }))) return;
      // An expiry reminder tapped before sign-in: open its room (access is checked there).
      const reminderRoom = takePendingReminderRoom();
      if (reminderRoom) {
        router.push({ pathname: '/room/[id]', params: { id: reminderRoom, from: 'reminder' } });
        return;
      }
      load();
    }, [load, router]),
  );

  return (
    <>
      {/* UX P1-5: two separate 44 pt header buttons (they shared one glass pill and read as one). */}
      <Stack.Toolbar placement="right">
        {/* Qrewing Calendar (Plus preview); the screen shows the upsell without it. */}
        <Stack.Toolbar.Button
          icon="calendar"
          accessibilityLabel={en.calendar.openLabel}
          onPress={() => router.push('/calendar')}
          separateBackground
        />
        <Stack.Toolbar.View hidesSharedBackground separateBackground>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={en.home.profile}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.avatarHit, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialOf(profile?.display_name)}</Text>
            </View>
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <QScreen
        floating={notice ? <Snackbar notice={notice} onHide={hideNotice} /> : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.secondaryLabel}
            onRefresh={() => {
              setRefreshing(true);
              setOpenChatKey((k) => k + 1);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
        title={en.home.title}
        subtitle={`${profile?.display_name ?? '…'} · ${isGuest ? en.profile.guest : en.profile.host}`}
      >
        <Button title={en.home.join} onPress={() => router.push('/join')} />
        {isGuest ? (
          // UX P2-8: a guest gets a next step, not a dead-end "Only hosts can create rooms."
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${en.home.guestCreateHint} ${en.profile.becomeHost}`}
            onPress={() => router.push('/upgrade')}
            style={({ pressed }) => [styles.hostLink, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.hostLinkText}>
              {en.home.guestCreateHint} <Text style={styles.hostLinkAction}>{en.profile.becomeHost} ›</Text>
            </Text>
          </Pressable>
        ) : (
          <Button title={en.home.create} variant="secondary" onPress={() => router.push('/create-room')} />
        )}

        {error ? (
          <>
            <Hint tone="error">{error}</Hint>
            <Button title={en.home.retry} variant="secondary" onPress={load} />
          </>
        ) : null}

        {rooms === null && !error ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel={en.home.loading} />
        ) : null}

        {rooms?.length === 0 ? (
          <EmptyState
            art="gathering"
            title={en.home.empty}
            body={isGuest ? en.home.emptyHintGuest : en.home.emptyHintHost}
          />
        ) : null}

        {/* The label counts only rows that show: a grace row dropping out may leave none. */}
        {rooms && rooms.some((r) => roomListEntry(r, now).kind !== 'hidden') ? <QLabel>{en.home.yourRooms}</QLabel> : null}
        {sortEndedLast(rooms ?? [], now).map(({ room, entry }) => {
          // Spec 7.3: a room the host ended stays listed during its grace window and opens Room ended (the
          // chat route shows it for a host-ended room); once grace ends the row drops out before the next read.
          // UX P1-5: those ended rows sit last, dimmed to 45%.
          const ended = entry.kind === 'grace';
          return (
          <Pressable
            key={room.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
            style={({ pressed }) => [styles.row, ended && styles.ended, pressed && { opacity: ended ? 0.3 : 0.6 }]}
          >
            {/* UX P1-5: the room's own ink icon (the Create room set) in a 40 pt ring, not the same art on every row. */}
            <View style={styles.ring}>
              <InkIcon emoji={iconEmoji(roomIcon(room))} size={22} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {room.name}
              </Text>
              {entry.kind === 'grace' ? (
                <Text style={styles.rowSubtitle}>{en.qrewing.grace.listRow(graceTime(entry.untilMs))}</Text>
              ) : (
                <>
                  <Text style={styles.rowSubtitle}>
                    {en.rooms.types[room.type as keyof typeof en.rooms.types] ?? room.type} ·{' '}
                    {en.home.endsIn(formatRemaining(new Date(room.expires_at).getTime() - now))}
                  </Text>
                  {/* Place and time (0026), when set: one extra line; rooms without them look as before. */}
                  <PlaceTimeLine room={room} />
                </>
              )}
            </View>
            {/* UX P1-5: people count at the trailing edge; ended rows and an unread count show none. */}
            {!ended && room.member_count !== null ? (
              <Text style={styles.count}>{en.room.people(room.member_count)}</Text>
            ) : null}
          </Pressable>
          );
        })}

        {/* Spec 11 D: public rooms anyone can join without a code (hidden until 0031 is live). */}
        <OpenChatSection refreshKey={openChatKey} onNotice={showNotice} />
      </QScreen>
    </>
  );
}

/** Visible rows, live ones first (server order kept) and ended (grace) rows last. */
function sortEndedLast(rooms: RoomWithCount[], now: number) {
  const rows = rooms.map((room) => ({ room, entry: roomListEntry(room, now) })).filter((r) => r.entry.kind !== 'hidden');
  return [...rows.filter((r) => r.entry.kind !== 'grace'), ...rows.filter((r) => r.entry.kind === 'grace')];
}

/** A public room's chosen icon (0031; not in the generated types yet), else the default for its type. */
function roomIcon(room: Room): string {
  return (room as Room & { public_icon?: string | null }).public_icon ?? defaultRoomIcon(room.type);
}

function initialOf(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

function PlaceTimeLine({ room }: { room: Room }) {
  const placeTime = placeTimeOf(room);
  if (!placeTime) return null;
  return (
    <Text style={styles.rowSubtitle} numberOfLines={1}>
      {placeTimeLine(placeTime)}
    </Text>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 24 },
  hostLink: { minHeight: size.hit, justifyContent: 'center' },
  hostLinkText: textRole.secondary,
  hostLinkAction: { color: colors.label, fontWeight: '600' },
  avatarHit: { width: size.hit, height: size.hit, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.label,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '600', color: colors.label },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  ended: { opacity: 0.45 },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.label,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.label },
  count: { fontSize: 14, color: colors.ink2, fontVariant: ['tabular-nums'] },
  rowSubtitle: { fontSize: 13, color: colors.ink2, fontVariant: ['tabular-nums'] },
});
