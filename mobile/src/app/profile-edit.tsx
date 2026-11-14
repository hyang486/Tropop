import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { QField, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { updateDisplayName, useAuth } from '@/lib/auth';
import { pickAvatar, removeProfilePhoto, setDefaultAvatar, setProfilePhoto } from '@/lib/avatar';
import { DEFAULT_AVATARS, defaultAvatarPath } from '@/lib/default-avatars';
import { errorMessage } from '@/lib/errors';

/** Qrew unit 5 (Q 07.01 Edit profile): profile photo and display name, moved here from Profile unchanged. */
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

  async function chooseDefault(key: string) {
    if (!session) return;
    setBusy('photo');
    setError(null);
    try {
      await setDefaultAvatar(session.user.id, key);
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
      <View style={styles.photoRow}>
        <Avatar path={profile?.avatar_path} name={profile?.display_name ?? '?'} size={72} />
        <View style={styles.photoActions}>
          <Button
            variant="secondary"
            title={profile?.avatar_path ? en.profile.changePhoto : en.profile.addPhoto}
            onPress={changePhoto}
            busy={busy === 'photo'}
          />
          {profile?.avatar_path && (
            <Button variant="secondary" title={en.profile.removePhoto} onPress={clearPhoto} disabled={busy !== null} />
          )}
        </View>
      </View>
      <Text style={styles.pickLabel}>{en.profile.chooseAvatar}</Text>
      <View style={styles.pickRow}>
        {DEFAULT_AVATARS.map((a) => {
          const path = defaultAvatarPath(a.key);
          const selected = profile?.avatar_path === path;
          return (
            <Pressable
              key={a.key}
              onPress={() => chooseDefault(a.key)}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel={`${a.name} ${en.profile.avatarOption.toLowerCase()}`}
              accessibilityState={{ selected }}
              style={[styles.pick, selected && styles.pickSelected]}
            >
              <Avatar path={path} name={a.key} size={44} />
            </Pressable>
          );
        })}
      </View>
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
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoActions: { flex: 1, gap: 8 },
  pickLabel: { fontSize: 13, color: colors.ink2 },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pick: { padding: 3, borderRadius: 30 },
  pickSelected: { backgroundColor: colors.wash2 },
});
