import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, colors, Field, Hint, Screen } from '@/components/ui';
import { en } from '@/i18n/en';
import { signOut, updateDisplayName, useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text selectable style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

export default function Profile() {
  const { session, profile, isGuest, refreshProfile } = useAuth();
  // null until the user edits the field; until then it shows the stored name.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile?.display_name ?? '';
  const [busy, setBusy] = useState<'save' | 'signout' | null>(null);
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

  async function logOut() {
    setBusy('signout');
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Field
        label={en.profile.nameLabel}
        value={name}
        onChangeText={(t) => {
          setDraft(t);
          setSaved(false);
        }}
        maxLength={40}
      />
      <Button title={saved ? en.profile.saved : en.profile.save} onPress={save} busy={busy === 'save'} />

      <View style={styles.group}>
        <Row
          label={en.profile.accountType}
          value={isGuest ? en.profile.guest : `${en.profile.host} · ${session?.user.email ?? ''}`}
        />
        <Row label={en.profile.language} value={en.profile.languageValue} />
      </View>

      {isGuest && (
        <Button variant="secondary" title={en.profile.becomeHost} onPress={() => router.push('/upgrade')} />
      )}

      {error && <Hint tone="error">{error}</Hint>}

      {isGuest && <Hint>{en.profile.guestSignOutWarning}</Hint>}
      <Button variant="destructive" title={en.profile.signOut} onPress={logOut} busy={busy === 'signout'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.field, borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    gap: 12,
  },
  rowLabel: { fontSize: 17, color: colors.label },
  rowValue: { fontSize: 17, color: colors.secondaryLabel, flexShrink: 1, textAlign: 'right' },
});
