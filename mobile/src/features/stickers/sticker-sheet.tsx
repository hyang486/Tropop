import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STICKER_IMAGES } from '@/components/sticker-art';
import { Text } from '@/components/text';
import { colors, useLift } from '@/components/ui';
import { en } from '@/i18n/en';
import { haptics } from '@/lib/haptics';
import { stickersIn, STICKER_TABS, type StickerTab } from '@/lib/stickers';

/**
 * B3 sticker sheet (50% detent, USC | Meet up | Connect). One tap sends and the sheet stays open; the host screen
 * owns the send (messages.kind 'sticker', body = sticker id). Stickers never change status or location.
 * Mount: render beside the composer; show with a sticker button (face.smiling) and pass onSend(stickerId).
 */
export function StickerSheet({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (stickerId: string) => void }) {
  const insets = useSafeAreaInsets();
  const lift = useLift();
  const [tab, setTab] = useState<StickerTab>('USC');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={en.chat.closeStickers} />
        <View style={[styles.sheet, lift, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal accessibilityLabel={en.chat.stickersTile}>
          <View style={styles.grabber} />
          <View style={styles.track} accessibilityRole="tablist">
            {STICKER_TABS.map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                hitSlop={{ top: 4, bottom: 4 }}
                onPress={() => {
                  if (t !== tab) haptics.selection();
                  setTab(t);
                }}
                style={[styles.seg, tab === t && [styles.segOn, lift]]}
              >
                <Text style={[styles.segText, tab === t && styles.segTextOn]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {stickersIn(tab).map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={s.caption}
                accessibilityHint="Sends to the room"
                onPress={() => {
                  haptics.press();
                  onSend(s.id);
                }}
                style={({ pressed }) => [styles.cell, pressed && { opacity: 0.5 }]}
              >
                <Image source={STICKER_IMAGES[s.id]} style={styles.art} resizeMode="contain" accessible={false} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: { height: '50%', backgroundColor: colors.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: 'continuous', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.grabber },
  track: { flexDirection: 'row', backgroundColor: colors.wash, borderRadius: 12, padding: 3 },
  seg: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  segOn: { backgroundColor: colors.lift },
  segText: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.label },
  segTextOn: { color: colors.label },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '25%', minHeight: 76, alignItems: 'center', justifyContent: 'center' },
  art: { width: 64, height: 64 },
});
