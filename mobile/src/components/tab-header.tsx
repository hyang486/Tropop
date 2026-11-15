import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import { profileCharacter } from '@/features/characters/character-store';
import { PersonAvatar } from '@/features/characters/person-avatar';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

/** tabs-spec §1: the 36 pt profile avatar (44 pt hit area) at the top right of every tab root → Profile. */
export function ProfileAvatarButton() {
  const router = useRouter();
  const { session, profile } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={en.tabs.profile}
      onPress={() => router.push('/profile')}
      style={styles.avatarHit}
    >
      <PersonAvatar
        userId={session?.user.id ?? ''}
        name={profile?.display_name ?? ''}
        path={profile?.avatar_path}
        character={profileCharacter(profile)}
        size={36}
      />
    </Pressable>
  );
}

/** tabs-spec §1: the "Tropop" wordmark as text on the Today and Moments headers (not the app icon). */
export function Wordmark() {
  return (
    <Text accessibilityRole="header" style={styles.wordmark}>
      {en.appName}
    </Text>
  );
}

const styles = StyleSheet.create({
  avatarHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  wordmark: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.tint, marginLeft: 16 },
});
