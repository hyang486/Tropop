import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, Hint, Screen } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

export default function Rooms() {
  const { profile, isGuest } = useAuth();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/profile" style={styles.headerLink} accessibilityRole="button">
              {en.home.profile}
            </Link>
          ),
        }}
      />
      <Screen>
        <Hint>
          {en.home.signedInAs(profile?.display_name ?? '…', isGuest ? en.profile.guest : en.profile.host)}
        </Hint>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{en.home.empty}</Text>
          <Hint>{en.home.emptyHint}</Hint>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.label },
  headerLink: { fontSize: 17, color: colors.tint, paddingHorizontal: 8 },
});
