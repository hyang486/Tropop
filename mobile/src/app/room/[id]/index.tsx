import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button, colors, Hint, Screen } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  endRoom,
  formatRemaining,
  getRoom,
  leaveRoom,
  listMembers,
  REMINDER_WINDOW_MS,
  type Room,
  type RoomMember,
} from '@/lib/rooms';
import { useNow } from '@/lib/use-now';

type State =
  | { status: 'loading' }
  | { status: 'gone' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: Room; members: RoomMember[] };

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const now = useNow(15_000);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const room = await getRoom(id);
      if (!room) {
        setState({ status: 'gone' });
        return;
      }
      setState({ status: 'ready', room, members: await listMembers(id) });
    } catch (e) {
      setState({ status: 'error', message: errorMessage(e) });
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator style={styles.loading} />
      </Screen>
    );
  }

  const remainingMs = state.status === 'ready' ? new Date(state.room.expires_at).getTime() - now : 0;

  // RLS hides the room once it expires, ends or the user leaves; the clock covers the gap until a reload.
  if (state.status === 'gone' || (state.status === 'ready' && remainingMs <= 0)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.gone}>
          <Text style={styles.goneTitle}>{en.room.gone}</Text>
          <Hint>{en.room.goneHint}</Hint>
        </View>
        <Button title={en.room.backToRooms} onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Hint tone="error">{state.message}</Hint>
        <Button title={en.home.retry} variant="secondary" onPress={load} />
      </Screen>
    );
  }

  const { room, members } = state;
  const isHost = room.host_id === userId;
  const remaining = formatRemaining(remainingMs);

  function confirmLeave() {
    Alert.alert(isHost ? en.room.endConfirmTitle : en.room.leaveConfirmTitle,
      isHost ? en.room.endConfirmBody : en.room.leaveConfirmBody, [
        { text: en.room.cancel, style: 'cancel' },
        {
          text: isHost ? en.room.end : en.room.leave,
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await (isHost ? endRoom(room.id) : leaveRoom(room.id));
              router.dismissTo('/');
            } catch (e) {
              setBusy(false);
              Alert.alert(errorMessage(e));
            }
          },
        },
      ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: room.name,
          headerRight: () => (
            <Link
              href={{ pathname: '/room/[id]/invite', params: { id: room.id } }}
              style={styles.headerLink}
              accessibilityRole="button"
            >
              {en.room.invite}
            </Link>
          ),
        }}
      />
      <Screen>
        <View style={styles.header}>
          <Text style={styles.remaining} accessibilityRole="header">
            {en.room.endsIn(remaining)}
          </Text>
          <Hint>{en.room.endsAt(new Date(room.expires_at).toLocaleString())}</Hint>
        </View>

        {remainingMs < REMINDER_WINDOW_MS ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.bannerTitle}>{en.room.reminderTitle}</Text>
            <Text style={styles.bannerBody}>{en.room.reminderBody(room.name, remaining)}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{en.room.members}</Text>
          {members.map((m) => (
            <View key={m.user_id} style={styles.member}>
              <Text style={styles.memberName} numberOfLines={1}>
                {m.display_name}
              </Text>
              <Text style={styles.memberTag}>
                {[m.role === 'host' ? en.room.host : null, m.user_id === userId ? en.room.you : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))}
        </View>

        <Hint>{en.room.chatComing}</Hint>

        <Button
          title={isHost ? en.room.end : en.room.leave}
          variant="destructive"
          busy={busy}
          onPress={confirmLeave}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
  headerLink: { fontSize: 17, color: colors.tint, paddingHorizontal: 8 },
  header: { gap: 4 },
  remaining: { fontSize: 28, fontWeight: '700', color: colors.label, fontVariant: ['tabular-nums'] },
  banner: {
    backgroundColor: colors.field,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 14,
    gap: 4,
  },
  bannerTitle: { fontSize: 16, fontWeight: '600', color: colors.label },
  bannerBody: { fontSize: 15, color: colors.label },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, color: colors.secondaryLabel, textTransform: 'uppercase' },
  member: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.field,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  memberName: { flex: 1, fontSize: 17, color: colors.label },
  memberTag: { fontSize: 14, color: colors.secondaryLabel },
  gone: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  goneTitle: { fontSize: 20, fontWeight: '600', color: colors.label },
});
