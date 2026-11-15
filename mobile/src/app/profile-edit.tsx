import { useState } from 'react';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Avatar } from '@/components/avatar';
import { QField, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { updateDisplayName, useAuth } from '@/lib/auth';
import { CharacterPicker } from '@/features/characters/character-picker';
import { profileCharacter, setProfileCharacter } from '@/features/characters/character-store';
import { PersonAvatar, realPhotoPath } from '@/features/characters/person-avatar';
import { pickAvatar, removeProfilePhoto, setProfilePhoto } from '@/lib/avatar';
import { defaultCharacter } from '@/lib/characters';
import { errorMessage } from '@/lib/errors';

/** Tropop unit 5 (Q 07.01 Edit profile): profile photo and display name, moved here from Profile unchanged. */
export default function ProfileEdit() {
  const { session, profile, refreshProfile } = useAuth();
  // null until the user edits the field; until then it shows the stored name.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile?.display_name ?? '';
  // UX2-139: Save turns on only after a real change (iOS edit-form convention).
  const trimmedName = name.trim();
  const nameChanged = trimmedName !== '' && trimmedName !== (profile?.display_name ?? '');
  const [busy, setBusy] = useState<'save' | 'photo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const photo = realPhotoPath(profile?.avatar_path);

  async function save() {
    if (!session) return;
    setBusy('save');
    setError(null);
    setSaved(false);
    try {
      await updateDisplayName(session.user.id, name);
      await refreshProfile();
      setDraft(null);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  // Spec §1.5: tapping the Photo tile while a photo is set opens Choose another photo / Remove photo / Cancel.
  function photoActions() {
    if (busy !== null) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [en.profile.chooseAnotherPhoto, en.profile.removePhoto, en.profile.deleteCancel],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (i) => {
        if (i === 0) void changePhoto();
        else if (i === 1) void clearPhoto();
      },
    );
  }

  async function changePhoto() {
    if (!session) return;
    setError(null);
    try {
      const uri = await pickAvatar();
      if (!uri) return;
      setBusy('photo');
      await setProfilePhoto(session.user.id, uri);
      await refreshProfile();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  // Depends on 0043 (profiles.avatar_character): choosing a character selects it and clears the photo.
  async function chooseCharacter(id: number) {
    if (!session) return;
    setBusy('photo');
    setError(null);
    try {
      await setProfileCharacter(session.user.id, id);
      await refreshProfile();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function clearPhoto() {
    if (!session) return;
    setBusy('photo');
    setError(null);
    try {
      await removeProfilePhoto(session.user.id);
      await refreshProfile();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <QScreen
      title={en.profile.editProfile}
      subtitle={en.profile.editProfileHint}
      actions={<Button title={saved ? en.profile.saved : en.profile.save} onPress={save} busy={busy === 'save'} disabled={!nameChanged} />}
    >
      <View style={styles.hero}>
        <PersonAvatar
          userId={session?.user.id ?? ''}
          name={profile?.display_name ?? '?'}
          path={profile?.avatar_path}
          character={profileCharacter(profile)}
          size={144}
        />
      </View>
      <Text style={styles.pickLabel}>{en.profile.chooseCharacter}</Text>
      <CharacterPicker
        selected={photo ? 'photo' : (profileCharacter(profile) ?? defaultCharacter(session?.user.id ?? ''))}
        onPickCharacter={chooseCharacter}
        onPickPhoto={photo ? photoActions : changePhoto}
        photoNode={photo ? <Avatar path={photo} name={profile?.display_name ?? '?'} size={72} /> : undefined}
      />
      {/* UX2-63: a "Name" label above the field, styled like "Or choose a picture". */}
      <Text style={styles.pickLabel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {en.profile.nameHeading}
      </Text>
      <QField
        label={en.profile.nameLabel}
        value={name}
        onChangeText={(t) => {
          setDraft(t);
          setSaved(false);
        }}
        maxLength={40}
      />
      {error && <Hint tone="error">{error}</Hint>}
    </QScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  pickLabel: { fontSize: 13, color: colors.ink2 },
});
