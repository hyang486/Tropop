import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { InkIcon } from '@/components/calendar/ink-icon';
import { InkArt } from '@/components/ink-art';
import { Pill } from '@/components/pill';
import { ProfileRetry } from '@/components/profile-retry';
import { QScreen } from '@/components/q-screen';
import { Button, colors, Hint, size, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { errorKind } from '@/lib/error-kind';
import { syncExpiryReminders, takePendingReminderRoom } from '@/lib/expiry-reminders';
import { pruneRoomCaches } from '@/lib/media';
import { resumePendingInvite } from '@/lib/invite';
import { formatRemaining, listMyRooms, type Room, type RoomWithCount } from '@/lib/rooms';
import { chatLine } from '@/lib/chat-line';
import { useNow } from '@/lib/use-now';
import { purgeStaleAskHistories } from '@/features/event/ask-store';
import { OpenChatSection } from '@/features/event/open-chat-section';
import { groupBySection, roomSection } from '@/features/event/rooms-sections';
import { fetchRoomSummaries } from '@/features/event/room-summary-api';
import {
  isLive,
  lastItemLine,
  rowAccessibilityLabel,
  rowTimeLabel,
  sortByLastItem,
  rowMetaLine,
  unreadLabel,
  type RoomSummary,
} from '@/features/event/room-summary';
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
  // UX3-A01: last item and unread per room (0037); null while unknown or when the read failed.
  const [summaries, setSummaries] = useState<Map<string, RoomSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // UX2-26: while Rooms already says offline, Open chat hides its own load error.
  const [offline, setOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // BUG-OC1: pull to refresh re-reads my rooms and Open chat (bumping its key).
  const [refreshing, setRefreshing] = useState(false);
  const [openChatKey, setOpenChatKey] = useState(0);
  // UX P1-6: one Open chat notice at a time; the id re-shows (and re-reads) the same text.
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const showNotice = useCallback((text: string) => setNotice((n) => ({ id: (n?.id ?? 0) + 1, text })), []);
  const hideNotice = useCallback(() => setNotice(null), []);
  const rows = visibleRows(rooms ?? [], now);
  // UX3-A02: the empty layout only once the read answered with no rows (not while loading or on an error).
  const empty = rooms !== null && rows.length === 0 && !error;

  const load = useCallback(async () => {
    try {
      const list = await listMyRooms();
      setRooms(list);
      setError(null);
      setSummaries(await fetchRoomSummaries(list.filter((r) => r.deleted_at === null).map((r) => r.id)));
      setOffline(false);
      // Drop cached originals of rooms that ended, expired or were left since the last visit.
      pruneRoomCaches(list.map((r) => r.id));
      // Spec 10.4: Ask Qrewing history goes once a room ended (grace counts as ended), expired or was left.
      void purgeStaleAskHistories(list.filter((r) => r.deleted_at === null).map((r) => r.id));
      syncSiriRooms(list);
      // Qrewing Calendar: snapshot my rooms on this phone (kept after they end, for the month view and diary).
      syncCalendarRooms(uid, list);
      // Local 24-hour reminders for every open room; cancels those of rooms no longer listed. Rooms the host
      // ended (listed only during their grace window, spec 7) get no reminder.
      // UX2-127: the Rooms list never shows a cold notification prompt; the room screen still asks.
      syncExpiryReminders(
        list.filter((r) => r.deleted_at === null),
        true,
        { ask: false },
      );
    } catch (e) {
      setError(en.home.loadFailed);
      setOffline(errorKind(e) === 'offline');
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
      >
        {/* UX3-A02: no subtitle (the "Name · Host" line said nothing useful). With rooms (or while they load):
            one row of two 48 pt buttons, Join and Create; a guest gets Join alone, full width, and the
            Create account link moves under the list. No rooms: the gathering art and one line above today's
            two big buttons. */}
        {empty ? (
          <>
            <View style={styles.empty}>
              <InkArt art="gathering" width={240} />
              <Text style={styles.emptyLine}>{en.home.emptyLine}</Text>
            </View>
            <Button title={en.home.join} onPress={() => router.push('/join')} />
            {isGuest ? (
              <GuestCreateLink />
            ) : (
              <Button title={en.home.create} variant="secondary" onPress={() => router.push('/create-room')} />
            )}
          </>
        ) : isGuest ? (
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Button compact title={en.home.joinShort} onPress={() => router.push('/join')} />
            </View>
          </View>
        ) : (
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Button compact title={en.home.joinShort} onPress={() => router.push('/join')} />
            </View>
            <View style={styles.flex}>
              <Button compact title={en.home.createShort} variant="secondary" onPress={() => router.push('/create-room')} />
            </View>
          </View>
        )}

        <ProfileRetry />
        {error ? (
          <>
            <Hint tone="error">{error}</Hint>
            {/* UX2-42: busy until the read answers. */}
            <Button
              title={en.home.retry}
              variant="secondary"
              busy={retrying}
              onPress={() => {
                setRetrying(true);
                void load().finally(() => setRetrying(false));
              }}
            />
          </>
        ) : null}

        {rooms === null && !error ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel={en.home.loading} />
        ) : null}

        {/* UX3-A02: Happening now / Coming up / Ending soon; a header shows only over rows that show (a grace row
            dropping out may leave none). */}
        {groupBySection(rows, (r) => roomSection(r.room, r.entry.kind === 'grace', now)).map((group) => (
          <View key={group.section} style={styles.section}>
            <Text style={styles.sectionHeader} accessibilityRole="header">
              {en.home.sections[group.section]}
            </Text>
            {sortByLastItem(group.rows, (r) => summaries?.get(r.room.id)?.last_at).map(({ room, entry }) => {
          // Spec 7.3: a room the host ended stays listed during its grace window and opens Room ended (the
          // chat route shows it for a host-ended room); once grace ends the row drops out before the next read.
          // UX P1-5: those ended rows are dimmed to 45% (UX3-A02: under Ending soon).
          const ended = entry.kind === 'grace';
          if (ended) {
            return (
              <Pressable
                key={room.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
                style={({ pressed }) => [styles.row, styles.ended, pressed && { opacity: 0.3 }]}
              >
                <RoomRing room={room} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {room.name}
                  </Text>
                  <Text style={styles.rowMeta}>{en.qrewing.grace.listRow(graceTime(entry.untilMs))}</Text>
                </View>
              </Pressable>
            );
          }
          // UX3-A01: name / last item / Live + people + ends (or Starts …); time and unread pill trailing.
          const summary = summaries?.get(room.id);
          const line = summaries ? lastItemLine(summary, uid, en, chatLine) : null;
          const live = isLive(room, now);
          // rooms.visibility (0031) is not in the generated types yet; select('*') returns it.
          const meta = rowMetaLine(room as typeof room & { visibility?: string | null }, now, en, formatRemaining);
          const time = rowTimeLabel(summary?.last_at ?? null, now, en);
          const unread = unreadLabel(summary?.unread);
          return (
          <Pressable
            key={room.id}
            accessibilityRole="button"
            accessibilityLabel={rowAccessibilityLabel(en, { name: room.name, live, unread: summary?.unread, line: line?.text ?? null, meta })}
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <RoomRing room={room} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {room.name}
              </Text>
              {line ? (
                <Text style={[styles.rowLast, line.danger && styles.rowDanger]} numberOfLines={1}>
                  {line.text}
                </Text>
              ) : null}
              <View style={styles.metaLine}>
                {live ? <Pill variant="tag" text={en.home.row.live} /> : null}
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            </View>
            {time || unread ? (
              <View style={styles.trailing}>
                {time ? <Text style={styles.rowMeta}>{time}</Text> : null}
                {unread ? <Pill variant="count" text={unread} /> : null}
              </View>
            ) : null}
          </Pressable>
          );
            })}
          </View>
        ))}
        {isGuest && rows.length > 0 ? <GuestCreateLink /> : null}

        {/* Spec 11 D: public rooms anyone can join without a code (hidden until 0031 is live). */}
        <OpenChatSection refreshKey={openChatKey} onNotice={showNotice} roomsOffline={offline} />
      </QScreen>
    </>
  );
}

/** Visible rows in server order (UX3-A02 sections replace sorting ended rows last). */
function visibleRows(rooms: RoomWithCount[], now: number) {
  return rooms.map((room) => ({ room, entry: roomListEntry(room, now) })).filter((r) => r.entry.kind !== 'hidden');
}

/** UX P2-8: a guest gets a next step, not a dead-end "Only hosts can create rooms." UX3-A07: "Create account". */
function GuestCreateLink() {
  const router = useRouter();
  return (
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
  );
}

/** A public room's chosen icon (0031; not in the generated types yet), else the default for its type. */
function roomIcon(room: Room): string {
  return (room as Room & { public_icon?: string | null }).public_icon ?? defaultRoomIcon(room.type);
}

function initialOf(name: string | null | undefined): string {
  return name?.trim().charAt(0).toUpperCase() || '?';
}

/** UX P1-5: the room's own ink icon (the Create room set) in a 40 pt ring, not the same art on every row. */
function RoomRing({ room }: { room: Room }) {
  return (
    <View style={styles.ring}>
      <InkIcon emoji={iconEmoji(roomIcon(room))} size={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 24 },
  flex: { flex: 1 },
  // UX3-A02: 12 pt between the pair, about 16 pt under the title (the title block's 6 + body gap 12, less 2).
  pair: { flexDirection: 'row', gap: 12, marginTop: -2 },
  empty: { alignItems: 'center', gap: 16, marginVertical: 8 },
  emptyLine: { ...textRole.secondary, textAlign: 'center' },
  // Section header 13 pt semibold ink2, 22 pt above (10 + body gap 12) and 8 pt below.
  section: { gap: 12 },
  sectionHeader: { ...textRole.section, marginTop: 10, marginBottom: -4 },
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
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
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
  rowLast: { fontSize: 15, color: colors.ink2 },
  rowDanger: { color: colors.danger },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMeta: { flexShrink: 1, fontSize: 13, color: colors.ink2, fontVariant: ['tabular-nums'] },
  // Top-aligned: time, then 6 pt, then the unread pill.
  trailing: { alignSelf: 'flex-start', alignItems: 'flex-end', gap: 6 },
});
