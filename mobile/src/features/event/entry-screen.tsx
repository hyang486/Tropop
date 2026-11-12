import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { QField, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { useAuth } from '@/lib/auth';

import { getEntryProfile, saveEntryProfile } from './entry-api';
import { en } from '@/i18n/en';

import { ENTRY_LIMITS, type EntryProblem, entryDirty, validateEntry } from './event-plan';

const s = en.qrewing.entry;

function problemText(p: EntryProblem): string {
  switch (p) {
    case 'headlineRequired':
      return s.headlineRequired;
    case 'headlineTooLong':
      return s.headlineTooLong(ENTRY_LIMITS.headline);
    case 'interestsTooLong':
      return s.tooLong(s.interests, ENTRY_LIMITS.interests);
    case 'lookingForTooLong':
      return s.tooLong(s.lookingFor, ENTRY_LIMITS.lookingFor);
    case 'tooManyLinks':
      return s.tooManyLinks;
    case 'linkInvalid':
      return s.linkInvalid;
  }
}

/**
 * Entry info form (spec 3.2), pushed from the chat gate or Room info. `gate=1`: opened before chat, so Save
 * returns to the chat with `replace` and Back leaves the room screen as it was (the chat re-checks on focus).
 */
export function EntryScreen() {
  const { id, gate } = useLocalSearchParams<{ id: string; gate?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [headline, setHeadline] = useState('');
  const [interests, setInterests] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [links, setLinks] = useState<string[]>(['', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The saved entry could not be read: Save stays off so an empty form never replaces it.
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  // What the form held after the load (qa F2): leaving with other input asks before it is thrown away.
  const [loaded, setLoaded] = useState({ headline: '', interests: '', lookingFor: '', links: ['', '', ''] });
  const fields = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const focusNext = (i: number) => fields.current[i + 1]?.focus();
  // Set after a successful save: prevention turns off first, then the effect below leaves.
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getEntryProfile(id, userId)
      .then((row) => {
        if (!alive || !row) return;
        setHeadline(row.headline);
        setInterests(row.interests);
        setLookingFor(row.looking_for);
        setLinks([0, 1, 2].map((i) => row.links[i] ?? ''));
        setLoaded({
          headline: row.headline,
          interests: row.interests,
          lookingFor: row.looking_for,
          links: [0, 1, 2].map((i) => row.links[i] ?? ''),
        });
      })
      .catch(() => alive && setLoadFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, userId, loadTick]);

  const dirty = !loading && !loadFailed && entryDirty(loaded, { headline, interests, lookingFor, links });
  // `repeat` turns prevention off and then runs the blocked action (dispatching alone would be blocked again).
  usePreventRemove(dirty && !busy && !saved, ({ repeat }) => {
    Alert.alert(s.discardTitle, s.discardBody, [
      { text: s.keepEditing, style: 'cancel' },
      { text: s.discard, style: 'destructive', onPress: repeat },
    ]);
  });

  useEffect(() => {
    if (!saved) return;
    if (gate === '1') router.replace({ pathname: '/room/[id]', params: { id } });
    else router.back();
  }, [saved, gate, id, router]);

  async function save() {
    if (busy || saved || loading || loadFailed) return;
    const checked = validateEntry({ headline, interests, lookingFor, links });
    if ('problem' in checked) {
      setError(problemText(checked.problem));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await saveEntryProfile(id, checked.value);
    setBusy(false);
    if (res.error) {
      setError(res.offline ? en.qrewing.errors.network : s.saveFailed);
      return;
    }
    setSaved(true);
  }

  return (
    <QScreen
      title={s.title}
      subtitle={s.intro}
      actions={
        <>
          {error ? <Hint tone="error">{error}</Hint> : null}
          {loadFailed ? (
            <Button title={s.retry} variant="secondary" onPress={() => {
                setLoading(true);
                setLoadFailed(false);
                setLoadTick((n) => n + 1);
              }} />
          ) : (
            <Button title={s.save} onPress={save} busy={busy} disabled={loading} />
          )}
        </>
      }
    >
      <Stack.Screen
        options={{
          title: s.title,
          headerTitle: '',
          // qa F1: Save stays reachable from the header while the keyboard covers the bottom.
          headerRight: () =>
            loading || loadFailed ? null : (
              <Pressable onPress={save} disabled={busy} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.headerSave, busy && styles.headerSaveBusy]}>{s.save}</Text>
              </Pressable>
            ),
        }}
      />
      {loading ? (
        <ActivityIndicator />
      ) : loadFailed ? (
        <Hint tone="error">{s.loadFailed}</Hint>
      ) : (
        <>
          <QLabel>{s.headline}</QLabel>
          <QField
            label={s.headline}
            placeholder={s.headlinePlaceholder}
            value={headline}
            onChangeText={setHeadline}
            maxLength={ENTRY_LIMITS.headline}
            ref={(r) => { fields.current[0] = r; }}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => focusNext(0)}
          />
          <QLabel>{s.interests}</QLabel>
          <QField
            label={s.interests}
            placeholder={s.interestsPlaceholder}
            value={interests}
            onChangeText={setInterests}
            maxLength={ENTRY_LIMITS.interests}
            multiline
            ref={(r) => { fields.current[1] = r; }}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => focusNext(1)}
          />
          <QLabel>{s.lookingFor}</QLabel>
          <QField
            label={s.lookingFor}
            placeholder={s.lookingForPlaceholder}
            value={lookingFor}
            onChangeText={setLookingFor}
            maxLength={ENTRY_LIMITS.lookingFor}
            multiline
            ref={(r) => { fields.current[2] = r; }}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => focusNext(2)}
          />
          <QLabel>{s.links}</QLabel>
          {links.map((link, i) => (
            <QField
              key={i}
              label={`${s.links} ${i + 1}`}
              placeholder={s.linkPlaceholder}
              value={link}
              onChangeText={(t) => setLinks((cur) => cur.map((v, j) => (j === i ? t : v)))}
              maxLength={ENTRY_LIMITS.link}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              textContentType="URL"
              ref={(r) => { fields.current[3 + i] = r; }}
              returnKeyType={i < 2 ? 'next' : 'done'}
              submitBehavior={i < 2 ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={() => (i < 2 ? focusNext(3 + i) : save())}
            />
          ))}
          <Text style={styles.note}>{s.linksNote}</Text>
        </>
      )}
    </QScreen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: colors.secondaryLabel },
  headerSave: { fontSize: 17, fontWeight: '600', color: colors.tint, paddingHorizontal: 8 },
  headerSaveBusy: { opacity: 0.4 },
});
