import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { QField, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';

import { getEntryProfile, saveEntryProfile } from './entry-api';
import { ENTRY_LIMITS, type EntryProblem, validateEntry } from './event-plan';
import { eventStrings } from './strings';

const s = eventStrings.entry;

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
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, userId]);

  async function save() {
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
      setError(res.error);
      return;
    }
    if (gate === '1') router.replace({ pathname: '/room/[id]', params: { id } });
    else router.back();
  }

  return (
    <QScreen
      title={s.title}
      subtitle={s.intro}
      actions={
        <>
          {error ? <Hint tone="error">{error}</Hint> : null}
          <Button title={s.save} onPress={save} busy={busy} disabled={loading} />
        </>
      }
    >
      <Stack.Screen options={{ title: s.title, headerTitle: '' }} />
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <QLabel>{s.headline}</QLabel>
          <QField
            label={s.headline}
            placeholder={s.headlinePlaceholder}
            value={headline}
            onChangeText={setHeadline}
            maxLength={ENTRY_LIMITS.headline}
            returnKeyType="next"
          />
          <QLabel>{s.interests}</QLabel>
          <QField
            label={s.interests}
            placeholder={s.interestsPlaceholder}
            value={interests}
            onChangeText={setInterests}
            maxLength={ENTRY_LIMITS.interests}
            multiline
            submitBehavior="blurAndSubmit"
          />
          <QLabel>{s.lookingFor}</QLabel>
          <QField
            label={s.lookingFor}
            placeholder={s.lookingForPlaceholder}
            value={lookingFor}
            onChangeText={setLookingFor}
            maxLength={ENTRY_LIMITS.lookingFor}
            multiline
            submitBehavior="blurAndSubmit"
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
});
