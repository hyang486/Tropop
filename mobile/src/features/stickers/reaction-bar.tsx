import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REACTION_IMAGES } from '@/components/sticker-art';
import { Text } from '@/components/text';
import { colors, useLift } from '@/components/ui';
import { en } from '@/i18n/en';
import { haptics } from '@/lib/haptics';
import { REACTIONS } from '@/lib/stickers';

/**
 * B3 reaction bar: a lift pill with the six quick reactions plus "+" for the full 3 x 4 grid. Tap toggles the
 * viewer's reaction (reaction smallint 1-12) and calls onPick(id); the host screen decides add vs remove.
 * Mount: render inside the message long-press menu, above the existing actions.
 */
export function ReactionBar({ onPick }: { onPick: (reaction: number) => void }) {
  const lift = useLift();
  const [all, setAll] = useState(false);
  const pick = (id: number) => {
    haptics.selection();
    setAll(false);
    onPick(id);
  };
  return (
    <>
      <View style={[styles.pill, lift]}>
        {REACTIONS.filter((r) => r.bar).map((r) => (
          <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={en.chat.reactWith(r.label)} onPress={() => pick(r.id)} style={styles.target}>
            <Image source={REACTION_IMAGES[r.id][28]} style={styles.icon} accessible={false} />
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel={en.chat.moreReactions} onPress={() => setAll(true)} style={styles.target}>
          <View style={styles.plus}>
            <Text style={styles.plusText}>+</Text>
          </View>
        </Pressable>
      </View>
      <ReactionGrid visible={all} onClose={() => setAll(false)} onPick={pick} />
    </>
  );
}

/** All 12 reactions, 3 columns x 4 rows, label under each. */
export function ReactionGrid({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (reaction: number) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close reactions" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityViewIsModal accessibilityLabel="Reactions">
          <View style={styles.grid}>
            {REACTIONS.map((r) => (
              <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={en.chat.reactWith(r.label)} onPress={() => onPick(r.id)} style={styles.cell}>
                <Image source={REACTION_IMAGES[r.id][28]} style={styles.icon} accessible={false} />
                <Text style={styles.label}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.lift, borderRadius: 28, borderCurve: 'continuous', paddingHorizontal: 4 },
  target: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 28, height: 28 },
  plus: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.wash, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontSize: 18, lineHeight: 22, fontWeight: '600', color: colors.label },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: 'continuous', paddingHorizontal: 16, paddingTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.label },
});
