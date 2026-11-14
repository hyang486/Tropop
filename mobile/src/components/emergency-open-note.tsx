import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';

/** UX2-114: the red line above End room / End activity / Leave while an Emergency is still open. */
export function EmergencyOpenNote({ text }: { text: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      <SymbolView name="exclamationmark.triangle" size={13} tintColor={colors.errorText} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  text: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.errorText },
});
