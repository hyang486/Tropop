import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  authHeaders,
  type Media,
  type MediaFilter,
  objectUrl,
  pickFile,
  pickPhotosAndVideos,
  type PickedItem,
  type UploadJob,
  useRoomMedia,
  useUploads,
} from '@/lib/media';

const FILTERS: { key: MediaFilter; label: string }[] = [
  { key: 'all', label: en.media.all },
  { key: 'mine', label: en.media.mine },
  { key: 'others', label: en.media.others },
];
const COLUMNS = 3;
const GAP = 2;

export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;
  const token = session?.access_token;
  const [filter, setFilter] = useState<MediaFilter>('all');
  const media = useRoomMedia(id, filter, userId);
  const { reload } = media;
  const uploads = useUploads(id, userId, reload);
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);

  const choose = useCallback(
    async (pick: () => Promise<PickedItem[]>) => {
      try {
        const items = await pick();
        if (items.length > 0) uploads.add(items);
      } catch (e) {
        Alert.alert(en.media.uploadFailed, errorMessage(e));
      }
    },
    [uploads],
  );

  function openAddMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [en.media.addPhotos, en.media.addFile, en.media.cancel], cancelButtonIndex: 2 },
      (index) => {
        if (index === 0) choose(pickPhotosAndVideos);
        if (index === 1) choose(pickFile);
      },
    );
  }

  const emptyText = filter === 'mine' ? en.media.emptyMine : filter === 'others' ? en.media.emptyOthers : en.media.empty;

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: en.media.title,
          headerRight: () => (
            <Pressable onPress={openAddMenu} accessibilityRole="button" accessibilityLabel={en.media.add} hitSlop={8}>
              <SymbolView name="plus" size={22} tintColor={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.segment} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const selected = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.segmentItem, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {uploads.jobs.length > 0 ? (
        <View style={styles.jobs}>
          {uploads.jobs.map((job) => (
            <UploadRow key={job.id} job={job} onRetry={() => uploads.retry(job.id)} onDismiss={() => uploads.dismiss(job.id)} />
          ))}
        </View>
      ) : null}

      {media.loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : media.error && media.items.length === 0 ? (
        <View style={styles.center}>
          <Hint tone="error">{en.media.loadError}</Hint>
          <Button title={en.home.retry} variant="secondary" onPress={media.reload} />
        </View>
      ) : (
        <FlatList
          data={media.items}
          keyExtractor={(m) => m.id}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP }}
          contentInsetAdjustmentBehavior="automatic"
          onRefresh={media.reload}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{emptyText}</Text>
              <Hint>{en.media.emptyHint}</Hint>
            </View>
          }
          renderItem={({ item }) => <Tile media={item} size={tile} token={token} />}
        />
      )}
    </View>
  );
}

function Tile({ media, size, token }: { media: Media; size: number; token: string | undefined }) {
  const label = media.kind === 'video' ? en.media.video : media.kind === 'file' ? en.media.file : media.file_name;
  return (
    <Link href={{ pathname: '/room/[id]/media/[mediaId]', params: { id: media.room_id, mediaId: media.id } }} asChild>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel={label} style={{ width: size, height: size }}>
        {media.preview_path && token ? (
          <Image
            source={{ uri: objectUrl(media.preview_path), headers: authHeaders(token), cacheKey: media.preview_path }}
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

function UploadRow({ job, onRetry, onDismiss }: { job: UploadJob; onRetry: () => void; onDismiss: () => void }) {
  const failed = job.state === 'failed';
  const pct = Math.round(job.progress * 100);
  return (
    <View style={styles.job} accessibilityLiveRegion="polite">
      <View style={styles.jobText}>
        <Text numberOfLines={1} style={styles.jobName}>
          {job.item.fileName}
        </Text>
        <Text numberOfLines={2} style={[styles.jobStatus, failed && { color: colors.danger }]} selectable={failed}>
          {failed ? `${en.media.uploadFailed}: ${job.error ?? ''}` : en.media.uploading(pct)}
        </Text>
        {!failed ? (
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.max(2, pct)}%` }]} />
          </View>
        ) : null}
      </View>
      {failed ? (
        <View style={styles.jobActions}>
          <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.action}>{en.media.retry}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={6}>
            <Text style={[styles.action, { color: colors.secondaryLabel }]}>{en.media.dismiss}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loading: { marginTop: 40 },
  center: { padding: 24, gap: 12, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.label, textAlign: 'center' },
  segment: {
    flexDirection: 'row',
    margin: 12,
    padding: 2,
    borderRadius: 9,
    backgroundColor: colors.field,
  },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  segmentSelected: { backgroundColor: colors.tint },
  segmentText: { fontSize: 14, fontWeight: '500', color: colors.label },
  segmentTextSelected: { color: 'white' },
  jobs: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  job: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
  },
  jobText: { flex: 1, gap: 4 },
  jobName: { fontSize: 15, color: colors.label },
  jobStatus: { fontSize: 13, color: colors.secondaryLabel },
  jobActions: { gap: 8, alignItems: 'flex-end' },
  action: { fontSize: 15, color: colors.tint, fontWeight: '500' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.separator, overflow: 'hidden' },
  bar: { height: 4, backgroundColor: colors.tint },
  fill: { width: '100%', height: '100%' },
  fileTile: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, backgroundColor: colors.field },
  fileName: { fontSize: 12, color: colors.secondaryLabel, textAlign: 'center' },
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
