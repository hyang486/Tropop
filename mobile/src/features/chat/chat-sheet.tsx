import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type SFSymbol, SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { colors } from '@/components/ui';
import { en } from '@/i18n/en';

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={onShow}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} accessibilityLabel={en.chat.moreClose} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]} accessibilityViewIsModal>
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
}: {
  symbol: SFSymbol;
  label: string;
  detail?: string;
  onPress?: () => void;
  chevron?: boolean;
  right?: ReactNode;
}) {
  const content = (
    <>
      <SymbolView name={symbol} size={20} tintColor={colors.label} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {right}
      {onPress && chevron ? <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.separator, marginBottom: 8 },
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
    backgroundColor: colors.field,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  rowIcon: { width: 22, height: 22 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, color: colors.label },
  rowDetail: { fontSize: 13, color: colors.ink2 },
  pressed: { opacity: 0.5 },
  close: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  closeText: { fontSize: 15, color: colors.ink2 },
});
