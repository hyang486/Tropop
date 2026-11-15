import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { colors } from '@/components/ui';

/**
 * Shared pill (ux rule, 2026-11-14: borders and fills live in shared components so a restyle changes them once).
 * - `count`: ink fill, paper 13 pt semibold text, 22 pt high, min 22 pt wide (the Rooms unread pill, UX3-A01).
 * - `tag`: 1.2 pt ink outline, radius 8, 12 pt semibold, 6 pt horizontal padding (the Rooms "Live" tag).
 * Decorative for VoiceOver: the row that holds it speaks the value.
 */
export function Pill({ text, variant }: { text: string; variant: 'count' | 'tag' }) {
  return (
    <View
      style={variant === 'count' ? styles.count : styles.tag}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={variant === 'count' ? styles.countText : styles.tagText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  count: {
    height: 22,
    minWidth: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 13, fontWeight: '600', color: colors.onTint, fontVariant: ['tabular-nums'] },
  tag: {
    borderWidth: 1.2,
    borderColor: colors.label,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
  },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.label },
});
