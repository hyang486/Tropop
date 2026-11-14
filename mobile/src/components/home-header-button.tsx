import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';

/**
 * Spec 11 polish: the header's way home for a screen that opened as the root of the stack (a deep link, a cold
 * start or a Fast Refresh that restored it), where there is no Back. Signed out, `/` redirects to Welcome.
 */
export function HomeHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={en.room.backToRooms}
      hitSlop={8}
      onPress={() => router.replace('/')}
      style={styles.hit}
    >
      <SymbolView name="chevron.left" size={20} weight="semibold" tintColor={colors.label} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
});
