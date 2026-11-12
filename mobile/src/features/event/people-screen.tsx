import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { QCard, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';

import { listEntryProfiles } from './entry-api';
import { linksByUser } from './event-plan';
import { type MatchResult, type QrewingError, requestMatches, useQrewingRoom } from './qrewing-api';
import { eventStrings } from './strings';

const s = eventStrings.people;

type State =
  | { status: 'loading' }
  | { status: 'ready'; result: MatchResult; links: ReadonlyMap<string, string[]> }
  | { status: 'error'; error: QrewingError };

async function load(roomId: string): Promise<State> {
  const [res, profiles] = await Promise.all([requestMatches(roomId), listEntryProfiles(roomId).catch(() => [])]);
  if ('error' in res) return { status: 'error', error: res.error };
  return { status: 'ready', result: res, links: linksByUser(profiles) };
}

/**
 * People to meet (spec 3.2): Qrewing's suggestions from entry info, with each person's headline, the reason and
 * their links. Refresh asks again; the server reuses a list younger than 10 minutes and marks it stale.
 */
export function PeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQrewingRoom(id);
  const [state, setState] = useState<State>({ status: 'loading' });
  // Only the newest request may set the state (a Refresh after leaving, or two quick taps, must not).
  const latest = useRef(0);

  useEffect(() => {
    const req = latest;
    const n = ++req.current;
    load(id).then((next) => req.current === n && setState(next));
    return () => {
      req.current++;
    };
  }, [id]);

  const refresh = useCallback(() => {
    const n = ++latest.current;
    setState({ status: 'loading' });
    load(id).then((next) => latest.current === n && setState(next));
  }, [id]);

  const notConsented = q.me !== null && !q.me.aiOk;

  return (
    <QScreen
      title={s.title}
      actions={
        state.status === 'error' && state.error === 'no_entry' && !notConsented ? (
          <Button
            title={eventStrings.info.addEntry}
            onPress={() => router.push({ pathname: '/room/[id]/entry', params: { id } })}
          />
        ) : (
          <Button title={s.refresh} variant="secondary" onPress={refresh} busy={state.status === 'loading'} />
        )
      }
    >
      <Stack.Screen options={{ title: s.title, headerTitle: '' }} />
      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Hint>{s.loading}</Hint>
        </View>
      ) : state.status === 'error' ? (
        <Hint tone="error">
          {notConsented ? s.notConsented : state.error === 'no_entry' ? s.noEntry : eventStrings.errors[state.error]}
        </Hint>
      ) : state.result.matches.length === 0 ? (
        <Hint>{s.empty}</Hint>
      ) : (
        <>
          {state.result.stale ? <Hint>{s.stale}</Hint> : null}
          {state.result.matches.map((m) => (
            <QCard key={m.userId}>
              <Text style={styles.name}>{m.displayName}</Text>
              {m.headline ? <Text style={styles.headline}>{m.headline}</Text> : null}
              <Text style={styles.reason}>{m.reason}</Text>
              {(state.links.get(m.userId) ?? []).map((url) => (
                <Pressable key={url} onPress={() => Linking.openURL(url).catch(() => {})} accessibilityRole="link">
                  <Text style={styles.link} numberOfLines={1}>
                    {url.replace(/^https:\/\//i, '')}
                  </Text>
                </Pressable>
              ))}
            </QCard>
          ))}
        </>
      )}
    </QScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  name: { fontSize: 17, fontWeight: '600', color: colors.label },
  headline: { fontSize: 15, color: colors.secondaryLabel },
  reason: { fontSize: 15, color: colors.label, marginTop: 4 },
  link: { fontSize: 15, color: colors.tint, textDecorationLine: 'underline', marginTop: 4 },
});
