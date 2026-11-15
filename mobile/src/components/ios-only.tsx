import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors } from '@/components/ui';

/** Web placeholder for features that need the phone (map, camera, scanner). Wording is pending ux. */
export function IosOnly({ title }: { title: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>Available in the iOS app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '700', color: colors.label, textAlign: 'center' },
  body: { fontSize: 15, color: colors.label, textAlign: 'center' },
});
