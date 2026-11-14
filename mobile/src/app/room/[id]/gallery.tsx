import { Image } from 'expo-image';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type SFSymbol, SymbolView } from 'expo-symbols';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type AddChoice, AddMediaSheet } from '@/components/add-media-sheet';
import { EmptyState } from '@/components/empty-state';
import { HandTitle } from '@/components/hand-title';
import { ClosesSoonCard, SavedCard } from '@/components/media-cards';
import { PhotosOfMe } from '@/components/photos-of-me';
import { qSpacing } from '@/components/q-screen';
import { RoomEmergencyBanner } from '@/components/room-activity';
import { RoomEnded } from '@/components/room-ended';
import { QrewingHeaderButton, useQrewingAskButton } from '@/features/event/qrewing-fab';
import { Button, colors, radius } from '@/components/ui';
import { en } from '@/i18n/en';
import { addToRoom } from '@/lib/add-media';
import { useAuth } from '@/lib/auth';
import { endsDay } from '@/lib/chat-plan';
import { closesSoonMinutes } from '@/lib/expiry-plan';
import {
  authHeaders,
  formatBytes,
  type Media,
  type MediaFilter,
  objectUrl,
  pickFile,
  pickPhotosAndVideos,
  stopRoomUploads,
  takePhoto,
  type UploadJob,
  useRoomMedia,
  useUploads,
} from '@/lib/media';
import { sharedAge, takeSaved } from '@/lib/media-plan';
import { confirmOriginalsNotice } from '@/lib/originals-notice';
import { useRoomEvents } from '@/lib/room-channel';
import { deadEndStep } from '@/lib/storage-cap';
import { usePlanState } from '@/features/calendar/calendar-store';
import { getRoom, listMembers, type Room } from '@/lib/rooms';
import { memberName } from '@/lib/member-name';
import { useHeaderOverlap } from '@/lib/use-header-overlap';
import { useNow } from '@/lib/use-now';
import { useRoomOver } from '@/lib/use-room-over';
import { screenActions } from '@/features/recap/grace-plan';
import { graceTime, useGrace } from '@/features/recap/use-grace';

/** 'me' = Photos of me (face matching); it lists from the 'all' media query. */
type GalleryFilter = MediaFilter | 'me';
const FILTERS: { key: GalleryFilter; label: string; a11y?: string; symbol?: SFSymbol }[] = [
  { key: 'all', label: en.media.all },
  { key: 'mine', label: en.media.mine },
  { key: 'others', label: en.media.others },
  // UX2-66: face.smiling 13 pt before "Of me"; VoiceOver reads "Photos of me".
  { key: 'me', label: en.face.filter, a11y: en.face.title, symbol: 'face.smiling' },
];
const COLUMNS = 3;
const GAP = 2;
/** F1 (U5): Dynamic Type cap for the pinned footer (Originals line and Add photos or files). */
const FOOTER_FONT_CAP = 1.5;

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Qrew unit 5 (Q 05.01, 05.02, 05.04, 06.03): handwritten "Photos & files" with the room name, the filters as
 * pills, upload progress under them, then the grid. "+" and the pinned "Add photos or files" open the "Add to
 * the room" sheet. The pinned line says until when originals can be saved; in the room's last hour a card
 * says when it closes. After "Save original" on a detail, an "Original saved" card shows once here.
 */
export default function GalleryScreen() {
  // `filter: 'me'` comes from the grace Room ended screen's Photos of me link (spec 7.3).
  const { id, filter: initialFilter } = useLocalSearchParams<{ id: string; filter?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const token = session?.access_token;
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<GalleryFilter>(initialFilter === 'me' ? 'me' : 'all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [names, setNames] = useState<ReadonlyMap<string, string>>();
  // UX2-06 + C14: only a host confirmed Free sees "See Plus" on an out-of-space row; the room's plan is the host's.
  const isHost = !!room && room.host_id === userId;
  const hostPlan = usePlanState(isHost ? userId : null);
  // G-U6-1: the room read came back empty (RLS hides a room once it ends or expires, or after a leave).
  const [gone, setGone] = useState(false);
  const [saved, setSaved] = useState(false);
  const now = useNow(30_000);
  const { rootRef, onLayout: measureRoot, overlap: headerOverlap } = useHeaderOverlap();
  const media = useRoomMedia(id, filter === 'me' ? 'all' : filter, userId);
  const { reload } = media;
  const uploads = useUploads(id, reload);
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - qSpacing.side * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  // A11y sweep: "Photo by Mina, 2 min" (Video / File for the other kinds).
  const tileLabel = (item: Media) => {
    const by = item.uploader_id === userId ? en.media.you : memberName(names, item.uploader_id, room?.host_id, en.chat);
    const age = sharedAge(item.created_at, now);
    return en.media.tileSpoken(item.kind, by, age ? en.media.age(age.n, age.unit) : null);
  };

  // Room name and expires_at for the head and the originals lines (Q 05.02, 06.03). A failed or empty read only
  // hides those lines; the media list keeps its own loading and error states.
  const readRoom = useCallback(() => {
    getRoom(id)
      .then((r) => {
        setRoom(r);
        setGone(r === null);
      })
      .catch(() => undefined);
    // A11y sweep: uploader names for the tiles' VoiceOver labels; a failed read falls back to "Former member".
    listMembers(id)
      .then((members) => setNames(new Map(members.map((m) => [m.user_id, m.display_name]))))
      .catch(() => undefined);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      readRoom();
      // Q 05.04: "Original saved" once after a save on a media detail of this room.
      if (takeSaved(id)) setSaved(true);
    }, [id, readRoom]),
  );

  // G-U6-1, as Chat: a host's End, an expiry change or a removal arrives as a rooms / room_members notice; read
  // the room again (on the room's shared channel, so no extra subscription or polling).
  useRoomEvents(id, (event) => {
    if (event.table === 'rooms' || event.table === 'room_members') readRoom();
  });
  const ended = useRoomOver(room);
  // Spec 7.3: in the host's early-end grace window the gallery stays open read-only (view and download).
  const grace = useGrace(room);
  const can = screenActions('gallery', grace.grace ? 'grace' : 'open');
  // Sweep fix 6: pull to refresh shows its spinner until the read answers.
  const [pulling, setPulling] = useState(false);
  const reloadMedia = media.reload;
  const pullRefresh = useCallback(async () => {
    setPulling(true);
    try {
      await reloadMedia();
    } finally {
      setPulling(false);
    }
  }, [reloadMedia]);
  // Sweep fix 5: once the room is over its uploads stop; failed rows stay through the grace window.
  const over = gone || ended.over;
  const keepFailed = !gone && grace.grace;
  useEffect(() => {
    if (over) stopRoomUploads(id, keepFailed);
  }, [over, keepFailed, id]);
  // UX P0-2: Ask Qrewing is a header icon next to Add, not a floating button over the grid; not in grace.
  const ask = useQrewingAskButton(id);

  const run = useCallback(
    async (pick: typeof takePhoto) => {
      // Q 07.04: camera access off opens the Camera access is off screen instead of an alert.
      if ((await addToRoom(id, userId, pick)) === 'camera-denied') {
        router.push({ pathname: '/room/[id]/camera-off', params: { id } });
      }
    },
    [id, userId, router],
  );

  // #13: Take photo first, like Messages. Both photo options show the one-time originals notice.
  function onChoose(choice: AddChoice) {
    if (choice === 'file') {
      void run(pickFile);
      return;
    }
    const pick = choice === 'camera' ? takePhoto : pickPhotosAndVideos;
    void confirmOriginalsNotice().then((ok) => {
      if (ok) void run(pick);
    });
  }

  function confirmCancel(job: UploadJob) {
    Alert.alert(en.media.cancelUploadTitle, en.media.cancelUploadBody(job.item.fileName), [
      { text: en.media.keepUploading, style: 'cancel' },
      { text: en.media.cancelUpload, style: 'destructive', onPress: () => uploads.cancel(job.id) },
    ]);
  }

  // G-U6-1: no stale grid, upload rows or Add once the room is over.
  if (gone || (ended.over && !grace.grace)) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerTitle: '', headerRight: () => null }} />
        <RoomEnded room={gone ? null : room} nowMs={ended.nowMs ?? now} />
      </>
    );
  }

  const emptyText = filter === 'mine' ? en.media.emptyMine : filter === 'others' ? en.media.emptyOthers : en.media.empty;
  const expiresMs = room ? new Date(room.expires_at).getTime() : NaN;
  const closesIn = room && can.upload ? closesSoonMinutes(room.expires_at, now) : null;
  const originalsLine =
    grace.grace && grace.untilMs !== null
      ? en.qrewing.grace.readOnly(graceTime(grace.untilMs))
      : room && Number.isFinite(expiresMs) && expiresMs > now
      ? en.media.originalsUntil(
          endsDay(expiresMs, now),
          new Date(expiresMs).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          timeOf(expiresMs),
        )
      : null;

  // F1 (U5): upload rows and the Room closes / Original saved cards scroll with the content,
  // so at the largest text sizes they cannot squeeze the grid or the pinned footer off screen.
  const notices =
    uploads.jobs.length > 0 || saved || (closesIn != null && room) ? (
      <View style={styles.notices}>
        {uploads.jobs.length > 0 ? (
          <View style={styles.jobs}>
            {uploads.jobs.map((job) => (
              <UploadRow
                key={job.id}
                job={job}
                onRetry={() => uploads.retry(job.id)}
                onDismiss={() => uploads.dismiss(job.id)}
                onCancel={() => confirmCancel(job)}
                closed={grace.grace}
                step={job.deadEnd ? deadEndStep({ deadEnd: job.deadEnd, isHost, hostPlan }) : null}
                onSeePlus={() => router.push({ pathname: '/plan-preview', params: { from: 'storage' } })}
              />
            ))}
          </View>
        ) : null}
        {saved ? <SavedCard onDismiss={() => setSaved(false)} /> : null}
        {closesIn != null && room ? <ClosesSoonCard minutes={closesIn} time={timeOf(expiresMs)} /> : null}
      </View>
    ) : null;
  const scroll = (children: ReactNode) => (
    <ScrollView contentInsetAdjustmentBehavior="never">
      {notices}
      {children}
    </ScrollView>
  );

  return (
    <View ref={rootRef} onLayout={measureRoot} style={[styles.flex, { paddingTop: headerOverlap }]}>
      <Stack.Screen
        options={{
          title: en.media.title,
          headerTitle: '',
          // UX2-67: no header "+"; the labeled "Add photos or files" button at the bottom is the one way to add.
          headerRight: () => (can.upload ? (ask.available ? <QrewingHeaderButton onPress={ask.open} /> : null) : null),
        }}
      />
      {can.upload ? ask.sheet : null}
      {/* Q 05.02 head: handwritten title, gray room name, filter pills. */}
      <View style={styles.head}>
        <HandTitle style={styles.title}>{en.media.title}</HandTitle>
        {room ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {room.name}
          </Text>
        ) : null}
        <View style={styles.pills} accessibilityRole="tablist" accessibilityLabel={en.media.filters}>
          {FILTERS.map((f) => {
            const selected = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="tab"
                accessibilityLabel={f.a11y ?? f.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.pill, selected && styles.pillSelected, pressed && !selected && { opacity: 0.5 }]}
              >
                {f.symbol ? (
                  <SymbolView name={f.symbol} size={13} tintColor={selected ? colors.onTint : colors.label} />
                ) : null}
                <Text
                  style={[styles.pillText, selected && styles.pillTextSelected]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                  maxFontSizeMultiplier={1.6}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <RoomEmergencyBanner roomId={id} style={styles.emergency} />

      <View style={styles.body}>
        {filter === 'me' && userId ? (
          media.loading ? (
            scroll(<ActivityIndicator style={styles.loading} />)
          ) : media.error && media.items.length === 0 ? (
            // UX2-20 (E): a failed list is an error, never "No photos of you yet."
            scroll(
              <EmptyState title={en.media.loadError} action={{ title: en.home.retry, onPress: media.reload }} />,
            )
          ) : (
            <PhotosOfMe
              roomId={id}
              userId={userId}
              media={media.items}
              columns={COLUMNS}
              gap={GAP}
              renderTile={(item) => <Tile media={item} size={tile} token={token} label={tileLabel(item)} />}
              onRefreshMedia={media.reload}
              header={notices}
              readOnly={!can.upload}
            />
          )
        ) : media.loading ? (
          scroll(<ActivityIndicator style={styles.loading} />)
        ) : media.error && media.items.length === 0 ? (
          scroll(
            <EmptyState title={en.media.loadError} action={{ title: en.home.retry, onPress: media.reload }} />,
          )
        ) : (
          <FlatList
            data={media.items}
            keyExtractor={(m) => m.id}
            numColumns={COLUMNS}
            style={styles.grid}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ gap: GAP }}
            onRefresh={pullRefresh}
            refreshing={pulling}
            ListHeaderComponent={notices ?? undefined}
            ListEmptyComponent={
              <EmptyState art="camera" title={emptyText} body={en.media.emptyHint} />
            }
            renderItem={({ item }) => <Tile media={item} size={tile} token={token} label={tileLabel(item)} />}
          />
        )}
      </View>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {/* The pinned footer stays on screen at every text size: its line and button scale only so far. */}
        {originalsLine ? (
          <Text style={styles.originals} numberOfLines={2} maxFontSizeMultiplier={FOOTER_FONT_CAP}>
            {originalsLine}
          </Text>
        ) : null}
        {can.upload ? (
          <Button
            title={en.media.addButton}
            variant="secondary"
            onPress={() => setSheetOpen(true)}
            maxFontSizeMultiplier={FOOTER_FONT_CAP}
          />
        ) : null}
      </View>

      <AddMediaSheet visible={sheetOpen && can.upload} onClose={() => setSheetOpen(false)} onChoose={onChoose} />
    </View>
  );
}

function Tile({ media, size, token, label }: { media: Media; size: number; token: string | undefined; label: string }) {
  // UX2-80: a preview that fails to load shows a plain square; the tile stays tappable (the viewer has Try again).
  const [failed, setFailed] = useState(false);
  const preview = media.preview_path && token ? { path: media.preview_path, token } : null;
  return (
    <Link href={{ pathname: '/room/[id]/media/[mediaId]', params: { id: media.room_id, mediaId: media.id } }} asChild>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={preview && failed ? en.media.previewUnavailable(label) : label}
        style={{ width: size, height: size }}
      >
        {preview && failed ? (
          <View style={[styles.fill, styles.failedTile]}>
            <SymbolView name="photo" size={24} tintColor={colors.ink2} />
          </View>
        ) : preview ? (
          <Image
            onError={() => setFailed(true)}
            source={{ uri: objectUrl(preview.path), headers: authHeaders(preview.token), cacheKey: preview.path }}
            style={styles.fill}
            contentFit="cover"
            transition={100}
            cachePolicy="memory"
          />
        ) : (
          <View style={[styles.fill, styles.fileTile]}>
            <SymbolView name="doc" size={28} tintColor={colors.secondaryLabel} />
            <Text numberOfLines={2} style={styles.fileName}>
              {media.file_name}
            </Text>
          </View>
        )}
        {media.kind === 'video' ? (
          <View style={styles.badge}>
            <SymbolView name="play.fill" size={12} tintColor="white" />
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

function UploadRow({
  job,
  onRetry,
  onDismiss,
  onCancel,
  closed,
  step,
  onSeePlus,
}: {
  /** UX2-06 + C14: the next step on a dead-end row (no Retry). */
  step: 'plus' | 'reserve' | 'offline' | null;
  onSeePlus: () => void;
  job: UploadJob;
  onRetry: () => void;
  onDismiss: () => void;
  onCancel: () => void;
  /** Spec 7.3: the room ended while this upload ran; say so instead of the server's error. */
  closed?: boolean;
}) {
  const failed = job.state === 'failed';
  // UX2-06 (pattern D): out of space or a bad file is not red and has no Retry.
  const deadEnd = failed && !closed ? job.deadEnd : undefined;
  const pct = Math.round(job.progress * 100);
  const size = formatBytes(job.item.size);
  const status = deadEnd
    ? deadEnd === 'storage'
      ? `${en.media.outOfSpace}\n${en.media.outOfSpaceHint}${step === 'offline' ? `\n${en.planPreview.offline}` : ''}`
      : en.media.cantUpload
    : failed
      ? closed
        ? `${en.media.uploadFailed}: ${en.qrewing.grace.writeClosed}`
        : `${en.media.uploadFailed}: ${job.error ?? ''}`
      : job.state === 'queued'
        ? en.media.waiting
        : en.media.uploading(pct);
  return (
    <View style={styles.job} accessibilityLiveRegion="polite">
      <SymbolView
        name={deadEnd ? 'exclamationmark.circle' : failed ? 'exclamationmark.triangle.fill' : job.item.kind === 'video' ? 'video' : job.item.kind === 'file' ? 'doc' : 'photo'}
        size={20}
        tintColor={failed && !deadEnd ? colors.danger : colors.secondaryLabel}
      />
      <View style={styles.jobText}>
        <Text numberOfLines={1} style={styles.jobName}>
          {size ? `${job.item.fileName} · ${size}` : job.item.fileName}
        </Text>
        <Text numberOfLines={3} style={[styles.jobStatus, failed && !deadEnd && { color: colors.errorText }]} selectable={failed && !deadEnd}>
          {status}
        </Text>
        {!failed ? (
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: job.state === 'queued' ? 0 : pct }}
          >
            <View style={[styles.bar, { width: `${job.state === 'queued' ? 0 : Math.max(2, pct)}%` }]} />
          </View>
        ) : null}
        {failed ? (
          // UX2-35: one 44 pt action line under the message, from the text column's leading edge.
          <View style={styles.jobActions}>
            {deadEnd ? (
              step === 'plus' ? (
                <Pressable onPress={onSeePlus} accessibilityRole="button" style={styles.actionButton}>
                  <Text style={styles.action}>{en.media.seePlus}</Text>
                </Pressable>
              ) : step === 'reserve' ? (
                // C14: the plan is loading; keep the button's space, empty and hidden from VoiceOver.
                <View style={styles.actionButton} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text style={[styles.action, styles.reserved]}>{en.media.seePlus}</Text>
                </View>
              ) : null
            ) : closed ? null : (
              <Pressable onPress={onRetry} accessibilityRole="button" style={styles.actionButton}>
                <Text style={styles.action}>{en.media.retry}</Text>
              </Pressable>
            )}
            <Pressable onPress={onDismiss} accessibilityRole="button" style={styles.actionButton}>
              <Text style={styles.actionSecondary}>{en.media.dismiss}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {failed ? null : (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`${en.media.cancelUpload}: ${job.item.fileName}`}
          hitSlop={11}
        >
          <SymbolView name="xmark.circle.fill" size={22} tintColor={colors.secondaryLabel} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  head: { paddingHorizontal: qSpacing.side, paddingTop: 4, paddingBottom: 10, gap: 4 },
  title: { fontSize: 30, lineHeight: 38 },
  subtitle: { fontSize: 15, color: colors.ink2 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 10 },
  pill: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 6,
    // UX2-66: an optional 13 pt symbol sits before the label.
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
  },
  pillSelected: { backgroundColor: colors.tint },
  // flexShrink: in the row with a symbol, the label still shrinks to fit (adjustsFontSizeToFit).
  pillText: { fontSize: 14, color: colors.label, flexShrink: 1 },
  pillTextSelected: { color: colors.onTint },
  emergency: { paddingHorizontal: qSpacing.side, paddingBottom: 8 },
  loading: { marginTop: 40 },
  body: { flex: 1, paddingHorizontal: qSpacing.side },
  grid: { borderRadius: 12, borderCurve: 'continuous' },
  notices: { gap: 10, paddingBottom: 8 },
  actions: { paddingHorizontal: qSpacing.side, paddingTop: 12, gap: qSpacing.gap, backgroundColor: colors.background },
  originals: { fontSize: 13, color: colors.ink2 },
  jobs: { gap: 8 },
  job: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
  },
  jobText: { flex: 1, gap: 4 },
  jobName: { fontSize: 15, color: colors.label },
  jobStatus: { fontSize: 13, color: colors.ink2 },
  // 8 pt padding each side: 16 pt between the labels, and each button at least 44 × 44.
  jobActions: { flexDirection: 'row', minHeight: 44, marginStart: -8 },
  actionButton: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  action: { fontSize: 15, color: colors.label, fontWeight: '600' },
  reserved: { opacity: 0 },
  actionSecondary: { fontSize: 15, color: colors.ink2 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.separator, overflow: 'hidden' },
  bar: { height: 4, backgroundColor: colors.tint },
  fill: { width: '100%', height: '100%' },
  fileTile: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, backgroundColor: colors.field },
  failedTile: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.field },
  fileName: { fontSize: 12, color: colors.ink2, textAlign: 'center' },
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
