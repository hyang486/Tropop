import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { type SFSymbol, SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';

/**
 * Spec 11 A9/A12: the bottom sheet behind the chat header's bell and gear. Same paper sheet as the status
 * picker (Q 03.02): handle, handwritten title, body, a quiet Close.
 */
export function ChatSheet({
  visible,
  title,
  onClose,
  onShow,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onShow?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // UX2-46: Notices and every other chat sheet close at once when a link or notification tap navigates.
  const instant = useDismissOnLink(visible ? onClose : null);
  return (
    <Modal visible={visible} transparent animationType={instant ? 'none' : 'slide'} onRequestClose={onClose} onShow={onShow}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} accessibilityRole="button" accessibilityLabel={en.chat.moreClose} onPress={onClose} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.handle} />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} bounces={false}>
            <HandTitle style={styles.title}>{title}</HandTitle>
            {children}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText} maxFontSizeMultiplier={1.5}>
              {en.chat.moreClose}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** One iOS-Settings-style row inside a ChatSheet: symbol, label, optional detail, chevron when it navigates. */
export function SheetRow({
  symbol,
  label,
  detail,
  onPress,
  chevron = true,
  right,
  lead,
  a11yLabel,
}: {
  symbol: SFSymbol;
  label: string;
  detail?: string;
  /** UX2-04b: a 13 pt line above the detail; the detail then reads at 15 pt, up to 3 lines. */
  lead?: string;
  a11yLabel?: string;
  onPress?: () => void;
  chevron?: boolean;
  right?: ReactNode;
}) {
  const content = (
    <>
      <SymbolView name={symbol} size={20} tintColor={colors.label} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {lead ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {lead}
          </Text>
        ) : null}
        {detail ? (
          <Text style={lead ? styles.rowBody : styles.rowDetail} numberOfLines={lead ? 3 : undefined} ellipsizeMode="tail">
            {detail}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && chevron ? <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? (detail ? `${label}, ${detail}` : label)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.grabber, marginBottom: 8 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  title: { fontSize: 30, lineHeight: 38, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    // UX2-45: rows inside a sheet use cardStrong, so they show on the dark sheet surface.
    backgroundColor: colors.fieldStrong,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  rowIcon: { width: 22, height: 22 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, color: colors.label },
  rowDetail: { fontSize: 13, color: colors.ink2 },
  rowBody: { fontSize: 15, color: colors.ink2 },
  pressed: { opacity: 0.5 },
  close: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  closeText: { fontSize: 15, color: colors.ink2 },
});
