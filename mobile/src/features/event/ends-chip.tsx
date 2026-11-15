import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import { closesSoonMinutes } from '@/lib/expiry-plan';
import { en } from '@/i18n/en';

const LAST_TEN_MIN = 10;

/** B2 chat header chip: softGold pill under the header in the last 60 min; the last 10 min name the deletion. */
export function EndsChip({ expiresAt, nowMs }: { expiresAt: string; nowMs: number }) {
  const min = closesSoonMinutes(expiresAt, nowMs);
  if (min === null) return null;
  const label = min <= LAST_TEN_MIN ? en.chat.endsChipDelete : en.chat.endsChip(min);
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.chip} accessible accessibilityLabel={label}>
        <SymbolView name="clock" size={14} tintColor={colors.label} />
        <Text style={styles.text} maxFontSizeMultiplier={1.4}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: colors.softGold,
  },
  text: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.label },
});
