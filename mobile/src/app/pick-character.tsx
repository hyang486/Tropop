import { router } from 'expo-router';
import { useState } from 'react';

import { Avatar } from '@/components/avatar';
import { QLink, QScreen } from '@/components/q-screen';
import { Text } from '@/components/text';
import { Hint, textRole } from '@/components/ui';
import { CharacterPicker } from '@/features/characters/character-picker';
import { setProfileCharacter } from '@/features/characters/character-store';
import { realPhotoPath } from '@/features/characters/person-avatar';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { pickAvatar, setProfilePhoto } from '@/lib/avatar';
import { defaultCharacter } from '@/lib/characters';
import { errorMessage } from '@/lib/errors';

// B3 first run (after sign-up / guest name entry): the same grid as Edit profile, once. Depends on 0043
// (profiles.avatar_character). Tapping a character or a photo saves it and closes; Skip keeps the default character.
export default function PickCharacter() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id ?? '';
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<'photo' | number | null>(null);
  const photo = realPhotoPath(profile?.avatar_path);

  async function pick(id: number) {
    if (!userId || chosen !== null) return;
    setChosen(id);
    setError(null);
    try {
      await setProfileCharacter(userId, id);
      await refreshProfile();
      router.back();
    } catch (e) {
      setChosen(null);
      setError(errorMessage(e));
    }
  }

  async function pickPhoto() {
    if (!userId || chosen !== null) return;
    setError(null);
    try {
      const uri = await pickAvatar();
      if (!uri) return;
      setChosen('photo');
      await setProfilePhoto(userId, uri);
      await refreshProfile();
      router.back();
    } catch (e) {
      setChosen(null);
      setError(errorMessage(e));
    }
  }

  return (
    <QScreen title={en.profile.pickCharacterTitle} actions={<QLink title={en.profile.pickCharacterSkip} onPress={() => router.back()} />}>
      <Text style={textRole.secondary}>{en.profile.pickCharacterHint}</Text>
      <CharacterPicker
        selected={chosen ?? (photo ? 'photo' : defaultCharacter(userId))}
        onPickCharacter={pick}
        onPickPhoto={pickPhoto}
        photoNode={photo ? <Avatar path={photo} name={profile?.display_name ?? '?'} size={72} /> : undefined}
      />
      {error && <Hint tone="error">{error}</Hint>}
    </QScreen>
  );
}
