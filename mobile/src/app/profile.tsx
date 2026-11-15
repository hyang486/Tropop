import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { profileCharacter } from '@/features/characters/character-store';
import { PersonAvatar } from '@/features/characters/person-avatar';
import { QLink, QScreen } from '@/components/q-screen';
import { ProfileRetry } from '@/components/profile-retry';
import { QRowCard } from '@/components/q-row-card';
import { connectCopy } from '@/features/connect/copy';
import { useConnectSummary } from '@/features/connect/profile-rows';
import { Card, colors, Hint, textRole } from '@/components/ui';
import { en } from '@/i18n/en';
import { deleteAccount, signOut, useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';

/**
 * Qrew unit 5 (Q 07.01): handwritten title, account cards, Language / Plus preview / Log out as rows and Delete
 * account as a red text button. Photo and name are edited on Edit profile (profile-edit).
 */
export default function Profile() {
  const { session, profile, isGuest } = useAuth();
  const connect = useConnectSummary(!isGuest);
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
      // UX3-A07: no subtitle; the Account row below says the email or "Guest on this phone" (once, not twice).
    >
      <ProfileRetry />
      {/* B2 header block: avatar 72, name 20/28, Host/Guest meta, Edit text button (replaces the name row). */}
      <View style={styles.header}>
        <PersonAvatar userId={session?.user.id ?? ''} name={name} path={profile?.avatar_path} character={profileCharacter(profile)} size={72} />
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{name || '—'}</Text>
          <Text style={textRole.secondary}>{isGuest ? en.profile.roleGuest : en.profile.roleHost}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en.profile.editProfile}
          accessibilityHint={en.profile.editProfileButtonHint}
          hitSlop={8}
          onPress={editProfile}
          style={({ pressed }) => [styles.edit, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.editText}>{en.profile.edit}</Text>
        </Pressable>
      </View>

      {/* Card 1 "You" (B3) with the Connect rows (ux P1, spec b2-pace §5): Connections, My QR codes, then Plus;
          the Connect rows are for account holders only. */}
      <Text style={textRole.section} accessibilityRole="header">{en.profile.sectionYou}</Text>
      <Card>
        {isGuest ? null : (
          <QRowCard
            grouped
            icon="person.2"
            title={connectCopy.connectionsRow}
            badge={connect.pending > 0 ? String(connect.pending) : undefined}
            accessibilityLabel={
              connect.pending > 0
                ? `${connectCopy.connectionsRow}, ${connectCopy.pendingBadge(connect.pending)}`
                : undefined
            }
            onPress={() => router.push('/connect')}
          />
        )}
        {isGuest ? null : (
          <QRowCard
            grouped
            icon="qrcode"
            title={connectCopy.myCodesRow}
            value={connect.codes == null ? undefined : connectCopy.myCodesValue(connect.codes)}
            onPress={() => router.push('/connect/codes')}
          />
        )}
        {/* UX2-29: a guest can't create rooms, so no host-only Plus pitch; the row leads to a host account instead. */}
        {isGuest ? (
          <QRowCard grouped icon="person.badge.plus" title={en.profile.guestHostRow} onPress={() => router.push('/upgrade')} />
        ) : (
          <QRowCard grouped icon="sparkles" title={en.planPreview.profileLink} onPress={() => router.push('/plan-preview')} />
        )}
      </Card>

      <Text style={textRole.section} accessibilityRole="header">{en.profile.sectionSettings}</Text>
      <Card>
        {/* UX P2-7: a plain info row; the value is the email for an account and "Guest on this phone" for a guest. */}
        <QRowCard
          grouped
          icon="person.crop.circle"
          title={en.profile.account}
          value={accountValue}
          valueTruncate
          accessibilityLabel={accountValue ? `${en.profile.account}, ${accountValue}` : en.profile.account}
        />
        <QRowCard grouped icon="globe" title={en.profile.language} value={en.profile.languageValue} />
      </Card>

      <Card>
        <QRowCard
          grouped
          icon="rectangle.portrait.and.arrow.right"
          title={en.profile.signOut}
          subtitle={isGuest ? en.profile.guestSignOutWarning : undefined}
          onPress={confirmLogOut}
          action
          busy={busy === 'signout'}
        />
      </Card>

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
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  headerText: { flex: 1, gap: 2 },
  headerName: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label },
  edit: { minHeight: 44, justifyContent: 'center' },
  editText: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.tint },
  delete: { marginTop: 4, minHeight: 40, justifyContent: 'center' },
});
