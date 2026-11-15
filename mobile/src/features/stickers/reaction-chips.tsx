import { Image, Pressable, StyleSheet, View } from 'react-native';

import { REACTION_IMAGES } from '@/components/sticker-art';
import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import { chipLabel, groupReactions, type ReactionRow } from '@/lib/stickers';

/**
 * B3 reaction chips under a bubble: up to 4 chips (most used first), then "+N". Yours = soft gold with a Cardinal
 * border. Tap toggles yours; long-press opens the who-reacted sheet. Mount: under the bubble, aligned to its side.
 */
export function ReactionChips({
  rows,
  me,
  align = 'flex-start',
  onToggle,
  onMore,
}: {
  rows: readonly ReactionRow[];
  me: string | undefined;
  align?: 'flex-start' | 'flex-end';
  onToggle: (reaction: number) => void;
  /** Tap on "+N": opens the reaction picker. Chips themselves have no long-press. */
  onMore?: () => void;
}) {
  const { chips, more } = groupReactions(rows, me);
  if (chips.length === 0) return null;
  return (
    <View style={[styles.row, { justifyContent: align }]}>
      {chips.map((c) => (
        <Pressable
          key={c.reaction}
          accessibilityRole="button"
          accessibilityLabel={chipLabel(c)}
          onPress={() => onToggle(c.reaction)}
          style={[styles.chip, c.mine && styles.mine]}
        >
          <Image source={REACTION_IMAGES[c.reaction][20]} style={styles.icon} accessible={false} />
          <Text style={styles.count}>{c.count}</Text>
        </Pressable>
      ))}
      {more > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={`${more} more reactions`} onPress={onMore} style={styles.chip}>
          <Text style={styles.count}>+{more}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E6DED7', backgroundColor: colors.lift },
  mine: { backgroundColor: colors.softGold, borderColor: colors.tint, borderWidth: 1.5 },
  icon: { width: 20, height: 20 },
  count: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: colors.label },
});
