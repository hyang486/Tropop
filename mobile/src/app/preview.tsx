import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { HandTitle } from '@/components/hand-title';
import { InkArt } from '@/components/ink-art';
import { Button, colors, Hint, Screen } from '@/components/ui';
import { en } from '@/i18n/en';
import { formatDeletedAt } from '@/lib/create-defaults';
import { errorMessage } from '@/lib/errors';
import {
  joinRoom,
  previewRoom,
  REMINDER_WINDOW_MS,
  type Invite,
  type RoomPreview,
} from '@/lib/rooms';
import { useNow } from '@/lib/use-now';

export default function Preview() {
  const router = useRouter();
  const { code, token } = useLocalSearchParams<{ code?: string; token?: string }>();
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow();

  const invite: Invite = token ? { token } : { code: code ?? '' };

  useEffect(() => {
    let active = true;
    const target: Invite = token ? { token } : { code: code ?? '' };
    // No invite given: show the invalid-invite copy without recording a failed attempt.
    const request = !token && !code ? Promise.reject(new Error(en.rooms.errors.invalid)) : previewRoom(target);
    request
      .then((p) => active && setPreview(p))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [code, token]);

  function openRoom(id: string) {
    router.dismissTo('/');
    router.push({ pathname: '/room/[id]', params: { id } });
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      openRoom(await joinRoom(invite));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (!preview) {
    return (
      <Screen>
        {error ? (
          <>
            <Hint tone="error">{error}</Hint>
            <Button title={en.room.backToRooms} variant="secondary" onPress={() => router.dismissTo('/')} />
          </>
        ) : (
          <ActivityIndicator style={styles.loading} />
        )}
      </Screen>
    );
  }

  const expiresAt = new Date(preview.expires_at);
  const endsSoon = expiresAt.getTime() - now < REMINDER_WINDOW_MS;

  // Qrew redesign (Q 01.04, ruling R6): name → map → place + Open in Maps → date and time → art → Join, with no
  // summary line under the title. Map, place and time come with the optional place/time fields (a separate
  // unit with its own migration); until preview_room returns them those slots render nothing, so there are no
  // empty cards. Member count and limit and the end time stay reachable under Join.
  return (
    <Screen>
      <HandTitle>{preview.name}</HandTitle>
      <View style={styles.art}>
        <InkArt roomName={preview.name} />
      </View>
      {endsSoon ? <Hint>{en.preview.endsSoon}</Hint> : null}
      {error ? <Hint tone="error">{error}</Hint> : null}
      {preview.already_member ? (
        <>
          <Hint>{en.preview.alreadyMember}</Hint>
          <Button title={en.preview.open} onPress={() => openRoom(preview.room_id)} />
        </>
      ) : (
        <Button title={en.preview.join} onPress={join} busy={busy} />
      )}
      <View style={styles.footnote}>
        <Text style={styles.meta}>{en.preview.members(preview.member_count, preview.max_members)}</Text>
        <Text style={styles.meta}>{en.preview.endsAt(formatDeletedAt(expiresAt.getTime()))}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
  art: { paddingVertical: 12 },
  footnote: { alignItems: 'center', gap: 2 },
  meta: { fontSize: 14, color: colors.secondaryLabel, fontVariant: ['tabular-nums'], textAlign: 'center' },
});
