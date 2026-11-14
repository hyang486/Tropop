import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';

/**
 * Spec 11 A13: the important message (host notice, Qrewing flag or a mention) pinned under the header,
 * KakaoTalk notice style: megaphone, who and why, the message itself. Folded it is one line; the chevron
 * unfolds the whole text. Tapping the text jumps to the message; the cross hides this notice.
 * UX2-35: chevron and cross sit side by side, both shown folded, each a 28 pt box + 8 pt hitSlop = 44 pt target.
 */
export function PinnedNotice({
  heading,
  body,
  onOpen,
  onDismiss,
}: {
  heading: string;
  body: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card} accessibilityRole="alert">
      <SymbolView name="megaphone" size={18} tintColor={colors.label} style={styles.icon} />
      <Pressable
        style={styles.main}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityHint={en.chat.pinnedOpen}
      >
        <Text style={styles.heading} numberOfLines={1}>
          {heading}
        </Text>
        <Text style={styles.body} numberOfLines={open ? 8 : 1}>
          {body}
        </Text>
      </Pressable>
      <View style={styles.side}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          hitSlop={8}
          style={styles.target}
          accessibilityRole="button"
          accessibilityLabel={open ? en.chat.pinnedCollapse : en.chat.pinnedExpand}
          accessibilityState={{ expanded: open }}
        >
          <SymbolView name={open ? 'chevron.up' : 'chevron.down'} size={14} tintColor={colors.secondaryLabel} />
        </Pressable>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={styles.target}
          accessibilityRole="button"
          accessibilityLabel={en.chat.pinnedDismiss}
        >
          <SymbolView name="xmark" size={13} tintColor={colors.secondaryLabel} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.wash,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  icon: { width: 20, height: 20, marginTop: 1 },
  main: { flex: 1, gap: 2 },
  heading: { fontSize: 12, fontWeight: '600', color: colors.ink2 },
  body: { fontSize: 15, color: colors.label },
  // 16 pt apart so the two 8 pt hitSlops never overlap.
  side: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: -4, marginRight: -6 },
  target: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
