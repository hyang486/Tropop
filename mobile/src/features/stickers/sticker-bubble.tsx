import { Image, StyleSheet, View } from 'react-native';

import { STICKER_IMAGES } from '@/components/sticker-art';
import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import { stickerById, stickerCaption, stickerPreview } from '@/lib/stickers';

/**
 * B3 sticker in chat: 140 pt art, no bubble. An unknown id (art from a later build) renders its caption as text.
 * The host row supplies avatar, name, alignment and the time; this is only the content.
 * accessibilityLabel = "{name} sent a sticker: {caption}".
 */
export function StickerBubble({ stickerId, senderName }: { stickerId: string; senderName: string }) {
  const label = stickerPreview(senderName, stickerId);
  const source = stickerById(stickerId) ? STICKER_IMAGES[stickerId] : undefined;
  if (!source) {
    return (
      <View accessible accessibilityLabel={label} style={styles.fallback}>
        <Text style={styles.fallbackText}>{stickerCaption(stickerId)}</Text>
      </View>
    );
  }
  return <Image source={source} style={styles.art} resizeMode="contain" accessible accessibilityRole="image" accessibilityLabel={label} />;
}

const styles = StyleSheet.create({
  art: { width: 140, height: 140 },
  fallback: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.wash },
  fallbackText: { fontSize: 16, lineHeight: 24, color: colors.label },
});
