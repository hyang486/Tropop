import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

/**
 * Spec 11 polish: the header's way home for a screen that opened as the root of the stack (a deep link, a cold
 * start or a Fast Refresh that restored it), where there is no Back. Signed out, `/` redirects to Welcome.
 */
export function HomeHeaderButton() {
  const router = useRouter();
  // UX2-143: signed out, `/` lands on Welcome, so the label is plain "Back" (en.ts is in developer-event's lane;
  // reuse the existing 'Back' string).
  const signedIn = !!useAuth().session;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={signedIn ? en.room.backToRooms : en.qrewing.people.back}
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
