import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';
import { GRID_GUTTER, GRID_SIZE, GRID_TILE, mediaLayout, singleSize } from '@/features/chat/chat-media-plan';
import { en } from '@/i18n/en';
import { authHeaders, formatBytes, type Media, objectUrl } from '@/lib/media';

/**
 * UX3-B08: a "shared …" chat line drawn as the photos themselves. One photo: 220 pt, aspect kept, ≤ 280 pt tall.
 * Two or more: a 200 pt 2×2 grid (2 pt gutters, 16 pt outer radius), "+N" on the 4th tile. Files: 56 pt rows.
 * Thumbnails only (preview_path), never originals. A tile opens the viewer at that item; "+N" opens Photos.
 * VoiceOver reads the whole block as one button, "Sora shared 7 photos", that opens Photos.
 */
export function ChatMedia({
  items,
  token,
  label,
  onOpenItem,
  onOpenPhotos,
}: {
  items: Media[];
  token: string | undefined;
  /** "Sora shared 7 photos". */
  label: string;
  onOpenItem: (mediaId: string) => void;
  onOpenPhotos: () => void;
}) {
  const { tiles, more, files, single } = mediaLayout(items);
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={en.chat.openPhotosHint}
      onAccessibilityTap={onOpenPhotos}
      style={styles.block}
    >
      {single ? (
        <Thumb media={tiles[0]} token={token} style={[styles.single, singleSize(tiles[0].width, tiles[0].height)]} onPress={() => onOpenItem(tiles[0].id)} />
      ) : tiles.length > 0 ? (
        <View style={styles.grid}>
          {tiles.map((m, i) => {
            const last = i === 3 && more > 0;
            return (
              <Thumb
                key={m.id}
                media={m}
                token={token}
                style={[styles.tile, corner(i, tiles.length)]}
                onPress={last ? onOpenPhotos : () => onOpenItem(m.id)}
              >
                {last ? (
                  <View style={styles.more}>
                    <Text style={styles.moreText}>{`+${more}`}</Text>
                  </View>
                ) : null}
              </Thumb>
            );
          })}
        </View>
      ) : null}
      {files.map((f) => (
        <Pressable key={f.id} onPress={() => onOpenItem(f.id)} style={({ pressed }) => [styles.file, pressed && { opacity: 0.6 }]}>
          <SymbolView name="doc" size={22} tintColor={colors.label} />
          <View style={styles.fileText}>
            <Text style={styles.fileName} numberOfLines={1}>
              {f.file_name}
            </Text>
            {f.size_bytes ? <Text style={styles.fileSize}>{formatBytes(f.size_bytes)}</Text> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** 16 pt only on exposed outer corners (2 tiles: one row; 3: tile 2 also rounds its bottom-right, tile 3 both bottoms). */
function corner(i: number, n: number) {
  const r = 16;
  const top = i < 2;
  const bottom = n <= 2 || i >= 2 || (n === 3 && i === 1);
  const left = i % 2 === 0;
  const right = i % 2 === 1 || (n === 3 && i === 2);
  return {
    borderTopLeftRadius: top && left ? r : 0,
    borderTopRightRadius: top && right ? r : 0,
    borderBottomLeftRadius: bottom && left ? r : 0,
    borderBottomRightRadius: bottom && right ? r : 0,
  };
}

function Thumb({
  media,
  token,
  style,
  onPress,
  children,
}: {
  media: Media;
  token: string | undefined;
  style: object | object[];
  onPress: () => void;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const preview = media.preview_path && token && !failed ? media.preview_path : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.thumb, style, pressed && { opacity: 0.8 }]}>
      {preview && token ? (
        <Image
          onError={() => setFailed(true)}
          source={{ uri: objectUrl(preview), headers: authHeaders(token), cacheKey: preview }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={100}
          cachePolicy="memory"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.blank]}>
          <SymbolView name="photo" size={24} tintColor={colors.ink2} />
        </View>
      )}
      {media.kind === 'video' ? (
        <View style={styles.play}>
          <SymbolView name="play.fill" size={12} tintColor={colors.onPhotoScrim} />
        </View>
      ) : null}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  thumb: { overflow: 'hidden', backgroundColor: colors.field },
  single: { borderRadius: 16, borderCurve: 'continuous' },
  grid: { width: GRID_SIZE, flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GUTTER },
  tile: { width: GRID_TILE, height: GRID_TILE },
  blank: { alignItems: 'center', justifyContent: 'center' },
  play: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.photoScrim,
  },
  more: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.photoScrim },
  moreText: { fontSize: 18, fontWeight: '600', color: colors.onPhotoScrim },
  file: {
    minHeight: 56,
    width: GRID_SIZE + 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
  },
  fileText: { flex: 1, gap: 2 },
  fileName: { fontSize: 15, color: colors.label },
  fileSize: { fontSize: 13, color: colors.ink2 },
});
