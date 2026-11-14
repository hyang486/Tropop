import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useInk } from '@/components/hand-title';
import { colors } from '@/components/ui';

/**
 * Qrew unit 5: a pale card with a leading icon, a title and a small gray line (Q 07.01 "Mia Chen / Display name",
 * Q 03.03 "12 people / 8 arrived · View participants ›"). With onPress it is a button with a chevron.
 */
export function QRowCard({
  icon,
  leading,
  title,
  subtitle,
  value,
  valueTruncate,
  onPress,
  busy,
  accessibilityLabel,
  accessibilityHint,
  expanded,
  action,
  grouped,
}: {
  /** SF Symbol name for the leading icon. */
  icon?: string;
  /** A custom leading view (an avatar) instead of the icon. */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Gray text at the trailing edge (Language "English"). */
  value?: string;
  /** UX3-A07: a long value (an email) is 15 pt and shrinks with middle truncation instead of pushing the title. */
  valueTruncate?: boolean;
  onPress?: () => void;
  busy?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** For a card that shows and hides a section below it. */
  expanded?: boolean;
  /** UX2-62: a row that does something here (Log out) rather than opening a screen: no chevron. */
  action?: boolean;
  /** V1: a row inside a Card (no fill, no radius; the Card draws the surface and the dividers). */
  grouped?: boolean;
}) {
  const ink = useInk();
  const body = (
    <>
      {leading ?? (icon ? <SymbolView name={icon as never} size={24} tintColor={ink} style={styles.icon} /> : null)}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text
          style={[styles.value, valueTruncate && styles.valueTruncate]}
          numberOfLines={valueTruncate ? 1 : undefined}
          ellipsizeMode={valueTruncate ? 'middle' : undefined}
        >
          {value}
        </Text>
      ) : null}
      {busy ? (
        <ActivityIndicator />
      ) : onPress && !action ? (
        <SymbolView
          name={expanded === undefined ? 'chevron.right' : expanded ? 'chevron.up' : 'chevron.down'}
          size={14}
          weight="semibold"
          tintColor={colors.secondaryLabel}
        />
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.card, grouped && styles.grouped]} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!busy, disabled: !!busy, expanded }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.card, grouped && styles.grouped, pressed && { opacity: 0.6 }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    // V1: standalone is a wash fill with no border.
    backgroundColor: colors.wash,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  grouped: { backgroundColor: 'transparent', borderRadius: 0 },
  icon: { width: 28, height: 28 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 17, color: colors.label },
  subtitle: { fontSize: 13, color: colors.ink2 },
  value: { fontSize: 17, color: colors.ink2 },
  valueTruncate: { fontSize: 15, flexShrink: 1, maxWidth: '65%' },
});
