import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { InkArt, ThemeSticker } from '@/components/ink-art';
import { Pill } from '@/components/pill';
import { ProfileRetry } from '@/components/profile-retry';
import { QScreen } from '@/components/q-screen';
import { Button, Card, colors, Hint, size, Tag, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { takeCharacterPrompt } from '@/features/characters/first-run';
import { fetchHostFaces, type HostFace } from '@/features/characters/host-faces';
import { PersonAvatar } from '@/features/characters/person-avatar';
import { useAuth } from '@/lib/auth';
import { syncExpiryReminders, takePendingReminderRoom } from '@/lib/expiry-reminders';
import { pruneRoomCaches } from '@/lib/media';
import { resumePendingInvite } from '@/lib/invite';
import { formatRemaining, listMyRooms, type Room, type RoomWithCount } from '@/lib/rooms';
import { chatLine } from '@/lib/chat-line';
import { stickerPreview } from '@/lib/stickers';
import { useNow } from '@/lib/use-now';
import { acquireRoomChannel } from '@/lib/room-channel';
import { createRoomsLive } from '@/features/event/rooms-live';
import { purgeStaleAskHistories } from '@/features/event/ask-store';
import { groupBySection, roomSection } from '@/features/event/rooms-sections';
import { fetchRoomEmergencies, fetchRoomSummaries } from '@/features/event/room-summary-api';
import {
  emergencyLine,
  emergencyStartedAt,
  sortEmergencyFirst,
  type EmergencyLine,
  type EmergencyPerson,
} from '@/features/event/emergency-row';
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
import { syncSiriRooms } from '@/features/event/siri-mirror';
import { syncCalendarRooms } from '@/features/calendar/calendar-store';
import { roomListEntry } from '@/features/recap/grace-plan';
import { graceTime } from '@/features/recap/use-grace';

export default function Rooms() {
  const router = useRouter();
  const { isGuest, session } = useAuth();
  const uid = session?.user.id;
  const now = useNow();
  const [rooms, setRooms] = useState<RoomWithCount[] | null>(null);
  // UX3-A01: last item and unread per room (0037); null while unknown or when the read failed.
  const [summaries, setSummaries] = useState<Map<string, RoomSummary> | null>(null);
  // B3 (0043): the host's face per host id for the row tile; empty until known, then rows keep the room-type sticker.
  const [hostFaces, setHostFaces] = useState<Map<string, HostFace>>(new Map());
  // P3 Emergency row: who is in Emergency per open room; null when unknown or the read failed (normal rows).
  const [emergencies, setEmergencies] = useState<Map<string, EmergencyPerson[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // BUG-OC1: pull to refresh re-reads my rooms and Open chat (bumping its key).
  const [refreshing, setRefreshing] = useState(false);
  const rows = visibleRows(rooms ?? [], now);
  // UX3-A02: the empty layout only once the read answered with no rows (not while loading or on an error).
  const empty = rooms !== null && rows.length === 0 && !error;

  // B3 first run: after sign-up or guest name entry, "Pick your character" opens once (flag set by those screens).
  useEffect(() => {
    if (!uid) return;
    void takeCharacterPrompt().then((pending) => {
      if (pending) router.push('/pick-character');
    });
  }, [uid, router]);

  const load = useCallback(async () => {
    try {
      const list = await listMyRooms();
      setRooms(list);
      setError(null);
      const openIds = list.filter((r) => r.deleted_at === null).map((r) => r.id);
      const [nextSummaries, nextEmergencies] = await Promise.all([
        fetchRoomSummaries(openIds),
        fetchRoomEmergencies(openIds, en.rooms.someone),
      ]);
      setSummaries(nextSummaries);
      setEmergencies(nextEmergencies);
      void fetchHostFaces(list.map((r) => r.host_id)).then(setHostFaces, () => undefined);
      // Drop cached originals of rooms that ended, expired or were left since the last visit.
      pruneRoomCaches(list.map((r) => r.id));
      // Spec 10.4: Ask Trok history goes once a room ended (grace counts as ended), expired or was left.
      void purgeStaleAskHistories(list.filter((r) => r.deleted_at === null).map((r) => r.id));
      syncSiriRooms(list);
      // Trok Calendar: snapshot my rooms on this phone (kept after they end, for the month view and diary).
      syncCalendarRooms(uid, list);
      // Local 24-hour reminders for every open room; cancels those of rooms no longer listed. Rooms the host
      // ended (listed only during their grace window, spec 7) get no reminder.
      // UX2-127: the Rooms list never shows a cold notification prompt; the room screen still asks.
      syncExpiryReminders(
        list.filter((r) => r.deleted_at === null),
        true,
        { ask: false },
      );
    } catch {
      setError(en.home.loadFailed);
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

  // P3: while Rooms is focused, a new message in an open listed room (Emergency included) refreshes the last-item
  // lines within about a second, through the shared room:<id> broadcast topics. Ended rooms are not joined.
  const openKey = rows
    .filter((r) => r.entry.kind === 'open' && r.room.deleted_at === null)
    .map((r) => r.room.id)
    .sort()
    .join(',');
  const openKeyRef = useRef(openKey);
  useLayoutEffect(() => {
    openKeyRef.current = openKey;
  });
  const live = useRef<ReturnType<typeof createRoomsLive> | null>(null);
  useFocusEffect(
    useCallback(() => {
      const current = createRoomsLive({
        acquire: acquireRoomChannel,
        refetch: () => {
          const ids = splitKey(openKeyRef.current);
          void fetchRoomSummaries(ids).then((m) => {
            // A failed read keeps the lines already shown.
            if (m) setSummaries(m);
          });
          void fetchRoomEmergencies(ids, en.rooms.someone).then((m) => {
            if (m) setEmergencies(m);
          });
        },
      });
      live.current = current;
      current.setRooms(splitKey(openKeyRef.current));
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });
      return () => {
        sub.remove();
        current.stop();
        if (live.current === current) live.current = null;
      };
    }, [load]),
  );
  useEffect(() => {
    live.current?.setRooms(splitKey(openKey));
  }, [openKey]);

  return (
    <>
      <QScreen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.secondaryLabel}
            onRefresh={() => {
              setRefreshing(true);
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
              <InkArt art="gathering" />
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
              <Button compact icon="qrcode.viewfinder" title={en.home.joinShort} onPress={() => router.push('/join')} />
            </View>
          </View>
        ) : (
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Button compact icon="qrcode.viewfinder" title={en.home.joinShort} onPress={() => router.push('/join')} />
            </View>
            <View style={styles.flex}>
              <Button
                compact
                icon="plus"
                title={en.home.createShort}
                variant="secondary"
                onPress={() => router.push('/create-room')}
              />
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
            {/* V2: one Card per section; rows sit inside it, split by its inset wash line. */}
            <Card>
            {sortEmergencyFirst(
              sortByLastItem(group.rows, (r) => summaries?.get(r.room.id)?.last_at),
              (r) => (r.entry.kind === 'open' ? emergencyStartedAt(emergencies?.get(r.room.id)) : null),
            ).map(({ room, entry }) => {
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
                <RoomRing room={room} face={hostFaces.get(room.host_id)} />
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
          const line = summaries ? lastItemLine(summary, uid, en, chatLine, stickerPreview) : null;
          const live = isLive(room, now);
          // rooms.visibility (0031) is not in the generated types yet; select('*') returns it.
          const meta = rowMetaLine(room as typeof room & { visibility?: string | null }, now, en, formatRemaining);
          // P3 Emergency row (ux): line 2, the time and the tile switch while anyone here is in Emergency.
          const people = emergencies?.get(room.id);
          const emergency = emergencyLine(people, uid);
          const emergencyText = emergency ? emergencyCopy(emergency) : null;
          const time = rowTimeLabel(emergency ? emergencyStartedAt(people) : (summary?.last_at ?? null), now, en);
          const unread = unreadLabel(summary?.unread);
          const label = rowAccessibilityLabel(en, {
            name: room.name,
            live,
            unread: summary?.unread,
            // The Emergency text leads the label instead, so it is not spoken twice.
            line: emergencyText ? null : (line?.text ?? null),
            meta,
          });
          return (
          <Pressable
            key={room.id}
            accessibilityRole="button"
            accessibilityLabel={emergencyText ? `${en.home.row.emergencySpoken} ${emergencyText}. ${label}` : label}
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            {emergency ? <EmergencyTile /> : <RoomRing room={room} face={hostFaces.get(room.host_id)} />}
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {room.name}
              </Text>
              {emergencyText ? (
                <View style={styles.emergencyLine}>
                  <SymbolView name="exclamationmark.triangle.fill" size={12} tintColor={colors.danger} />
                  <Text style={styles.emergencyText} numberOfLines={1}>
                    {emergencyText}
                  </Text>
                </View>
              ) : line ? (
                <Text style={[styles.rowLast, line.danger && styles.rowDanger]} numberOfLines={1}>
                  {line.text}
                </Text>
              ) : null}
              <View style={styles.metaLine}>
                {live ? <Tag label={en.home.row.live} dot /> : null}
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
            </Card>
          </View>
        ))}
        {isGuest && rows.length > 0 ? <GuestCreateLink /> : null}

      </QScreen>
    </>
  );
}

/** Visible rows in server order (UX3-A02 sections replace sorting ended rows last). */
function splitKey(key: string) {
  return key === '' ? [] : key.split(',');
}

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

/** P3 Emergency row: line 2 copy. */
function emergencyCopy(line: EmergencyLine) {
  if (line.kind === 'own') return en.home.row.youAskedForHelp;
  if (line.kind === 'one') return en.home.row.needsHelp(line.name);
  return en.home.row.needsHelpMany(line.name, line.more);
}

/** P3 Emergency row (ux): the 48 pt tile on redwash with a danger "!" in place of the room art. */
function EmergencyTile() {
  return (
    <View style={[styles.ring, styles.ringEmergency]}>
      <SymbolView name="exclamationmark" size={22} weight="bold" tintColor={colors.danger} />
    </View>
  );
}

/** B2: the room-type sticker (40 pt) on a 48 pt wash tile. B3 (0043): the host's face (photo or character, 48) when known. */
function RoomRing({ room, face }: { room: Room; face?: HostFace }) {
  if (face) {
    return <PersonAvatar userId={room.host_id} name="" path={face.avatar_path} character={face.avatar_character} size={48} />;
  }
  return (
    <View style={styles.ring}>
      <ThemeSticker roomName={room.name} size={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 24 },
  flex: { flex: 1 },
  // V2: 10 pt between the pair, about 16 pt under the title underline (the title block's 6 + body gap 12, less 2).
  pair: { flexDirection: 'row', gap: 12, marginTop: -2 },
  empty: { gap: 16, marginVertical: 8 },
  emptyLine: { ...textRole.secondary, textAlign: 'center' },
  // Section header 13 pt semibold ink2, 22 pt above (10 + body gap 12) and 8 pt below.
  section: { gap: 12 },
  sectionHeader: { ...textRole.section, marginTop: 10, marginBottom: -4 },
  hostLink: { minHeight: size.hit, justifyContent: 'center' },
  hostLinkText: textRole.secondary,
  hostLinkAction: { color: colors.label, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  ended: { opacity: 0.45 },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: colors.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label },
  rowLast: { fontSize: 16, lineHeight: 24, color: colors.ink2 },
  rowDanger: { color: colors.danger },
  ringEmergency: { backgroundColor: colors.redwash },
  emergencyLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emergencyText: { flexShrink: 1, fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.danger },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMeta: { flexShrink: 1, fontSize: 12, lineHeight: 18, color: colors.ink2, fontVariant: ['tabular-nums'] },
  // Top-aligned: time, then 6 pt, then the unread pill.
  trailing: { alignSelf: 'flex-start', alignItems: 'flex-end', gap: 6 },
});
