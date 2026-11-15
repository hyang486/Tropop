import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import type { HeroTopic } from '../room-hero';
import { addNextLabel } from './day-detail-model';

/** "Add next {noun} to my calendar" (calendar-v2-spec §B3): opens the editor prefilled; nothing saves until Save. */
export function AddNext({ hero, onPress }: { hero?: HeroTopic; onPress: () => void }) {
  const label = addNextLabel(hero);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <SymbolView name="calendar.badge.plus" size={20} tintColor={colors.tint} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 56, borderRadius: 20, backgroundColor: '#F9E6E6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  pressed: { opacity: 0.7 },
  text: { fontSize: 17, lineHeight: 22, fontFamily: 'SourceSans3-Semibold', color: colors.tint },
});
