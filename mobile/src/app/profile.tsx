import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { QLink, QScreen } from '@/components/q-screen';
import { ProfileRetry } from '@/components/profile-retry';
import { QRowCard } from '@/components/q-row-card';
import { ProfileConnectRows } from '@/features/connect/profile-rows';
import { Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { deleteAccount, signOut, useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';

/**
 * Qrew unit 5 (Q 07.01): handwritten title, account cards, Language / Plus preview / Log out as rows and Delete
 * account as a red text button. Photo and name are edited on Edit profile (profile-edit).
 */
export default function Profile() {
  const { session, profile, isGuest } = useAuth();
  const [busy, setBusy] = useState<'signout' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = profile?.display_name ?? '';

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

  // UI audit (3): native confirm, default Cancel; the guest copy says the guest account cannot come back.
  function confirmLogOut() {
    Alert.alert(
      isGuest ? en.profile.guestSignOutConfirmTitle : en.profile.signOutConfirmTitle,
      isGuest ? en.profile.guestSignOutConfirmBody : en.profile.signOutConfirmBody,
      [
        { text: en.profile.deleteCancel, style: 'cancel' },
        { text: en.profile.signOutConfirmAction, style: 'destructive', onPress: logOut },
      ],
    );
  }

  async function runDelete() {
    setBusy('delete');
    setError(null);
    try {
      await deleteAccount();
    } catch {
      setError(en.profile.deleteFailed);
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert(
      en.profile.deleteConfirmTitle,
      isGuest ? en.profile.deleteConfirmBody : en.profile.deleteConfirmHostBody,
      [
        { text: en.profile.deleteCancel, style: 'cancel' },
        { text: en.profile.deleteConfirmAction, style: 'destructive', onPress: runDelete },
      ],
    );
  }

  const editProfile = () => router.push('/profile-edit');
  const accountValue = isGuest ? en.profile.guestAccount : session?.user.email;

  return (
    <QScreen
      title={en.profile.title}
      titleUnderline
      // UX3-A07: no subtitle; the Account row below says the email or "Guest on this phone" (once, not twice).
    >
      <ProfileRetry />
      <QRowCard
        leading={<Avatar path={profile?.avatar_path} name={name} size={36} />}
        title={name || '—'}
        subtitle={en.profile.nameLabel}
        accessibilityLabel={`${en.profile.nameLabel}: ${name}`}
        // UX2-62: the name row is the way into Edit profile (no separate button).
        accessibilityHint={en.profile.editProfile}
        onPress={editProfile}
      />
      {/* UX P2-7: a plain info row, not a checkmark that reads as a selected option. UX3-A07 (ux): the value is
          the email for an account and "Guest on this phone" for a guest; "Host" never labels the account. */}
      <QRowCard
        icon="person.crop.circle"
        title={en.profile.account}
        value={accountValue}
        valueTruncate
        accessibilityLabel={accountValue ? `${en.profile.account}, ${accountValue}` : en.profile.account}
      />

      <View style={styles.rows}>
        <QRowCard icon="globe" title={en.profile.language} value={en.profile.languageValue} />
        {isGuest ? null : <ProfileConnectRows />}
        {/* UX2-29: a guest can't create rooms, so no host-only Plus pitch; the row leads to a host account instead. */}
        {isGuest ? (
          <QRowCard icon="person.badge.plus" title={en.profile.guestHostRow} onPress={() => router.push('/upgrade')} />
        ) : (
          <QRowCard icon="sparkles" title={en.planPreview.profileLink} onPress={() => router.push('/plan-preview')} />
        )}
        <QRowCard
          icon="rectangle.portrait.and.arrow.right"
          title={en.profile.signOut}
          subtitle={isGuest ? en.profile.guestSignOutWarning : undefined}
          onPress={confirmLogOut}
          action
          busy={busy === 'signout'}
        />
      </View>

      {error && <Hint tone="error">{error}</Hint>}

      <View style={styles.delete}>
        {busy === 'delete' ? (
          <ActivityIndicator accessibilityLabel={en.profile.deleteAccount} />
        ) : (
          <QLink title={en.profile.deleteAccount} tone="danger" onPress={confirmDelete} disabled={busy !== null} />
        )}
      </View>
    </QScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 8, marginTop: 8 },
  delete: { marginTop: 4, minHeight: 40, justifyContent: 'center' },
});
