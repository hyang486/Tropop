// Spec 11 C: route `room/[id]/questions`. Question cards Qrewing sent me (it could not answer them): write the answer,
// optionally "Post as notice" (also pinned as the chat notice). The answer goes only to the asker.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { QCard, QField, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { listMembers } from '@/lib/rooms';

import { cardAnswer, type CardError, cardsIAnswered, cardsToAnswer, CARD_LIMITS, type QuestionCard } from './question-plan';
import { answerCard, loadCards, useRoomCards } from './question-store';

const s = en.questions;

export function QuestionsScreen() {
  const { id, cardId } = useLocalSearchParams<{ id: string; cardId?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id;
  const { cards, loaded } = useRoomCards(id);
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    loadCards(id);
    let live = true;
    listMembers(id)
      .then((m) => live && setNames(new Map(m.map((x) => [x.user_id, x.display_name]))))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);

  const waiting = cardsToAnswer(cards, me);
  // The card a notice opened goes first.
  const ordered = cardId ? [...waiting.filter((c) => c.id === cardId), ...waiting.filter((c) => c.id !== cardId)] : waiting;
  const done = cardsIAnswered(cards, me);
  const name = (uid: string) => names.get(uid) ?? en.chat.formerMember;

  return (
    <QScreen title={s.title} subtitle={s.intro}>
      <Stack.Screen
        options={{
          title: s.title,
          headerTitle: '',
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={en.qrewing.ask.done} onPress={() => router.back()} style={styles.headerHit}>
              <Text style={styles.done}>{en.qrewing.ask.done}</Text>
            </Pressable>
          ),
        }}
      />
      {!loaded ? (
        <ActivityIndicator />
      ) : (
        <>
          {ordered.length === 0 ? <Hint>{s.empty}</Hint> : null}
          {ordered.map((c) => (
            <AnswerCard key={c.id} card={c} asker={name(c.askerId)} />
          ))}
          {done.length > 0 ? <Text style={styles.section}>{s.yourAnswers}</Text> : null}
          {done.map((c) => (
            <QCard key={c.id}>
              <Text style={styles.from}>{s.asker(name(c.askerId))}</Text>
              <Text style={styles.question} selectable>
                {c.question}
              </Text>
              <Text style={styles.answer} selectable>
                {c.answer}
              </Text>
            </QCard>
          ))}
        </>
      )}
    </QScreen>
  );
}

function AnswerCard({ card, asker }: { card: QuestionCard; asker: string }) {
  const [draft, setDraft] = useState('');
  const [asNotice, setAsNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CardError | 'notice_long' | null>(null);
  const tooLongForNotice = asNotice && [...draft.trim()].length > CARD_LIMITS.notice;

  async function send() {
    if (busy) return;
    if (tooLongForNotice) {
      setError('notice_long');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await answerCard(card.id, draft, asNotice);
    setBusy(false);
    // On success the card leaves this list (the store merged it as answered).
    if ('error' in res) setError(res.error);
  }

  return (
    <QCard>
      <Text style={styles.from}>{s.asker(asker)}</Text>
      <Text style={styles.question} selectable>
        {card.question}
      </Text>
      <QField label={s.answerLabel} value={draft} onChangeText={setDraft} maxLength={CARD_LIMITS.answer} multiline style={styles.field} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{s.postAsNotice}</Text>
          <Text style={styles.rowHint}>{s.postAsNoticeHint}</Text>
        </View>
        <Switch value={asNotice} onValueChange={setAsNotice} accessibilityLabel={s.postAsNotice} />
      </View>
      {error ? <Hint tone="error">{error === 'notice_long' ? s.noticeTooLong : s.errors[error]}</Hint> : null}
      <Button title={s.send} onPress={send} busy={busy} disabled={!cardAnswer(draft, false) || busy} />
    </QCard>
  );
}

const styles = StyleSheet.create({
  headerHit: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  done: { fontSize: 17, fontWeight: '600', color: colors.tint, paddingHorizontal: 6 },
  flex: { flex: 1 },
  section: { fontSize: 13, fontWeight: '600', color: colors.secondaryLabel, textTransform: 'uppercase', marginTop: 8 },
  from: { fontSize: 13, color: colors.secondaryLabel },
  question: { fontSize: 17, fontWeight: '600', color: colors.label },
  answer: { fontSize: 16, color: colors.label },
  field: { maxHeight: 140, paddingTop: 13, paddingBottom: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 16, color: colors.label },
  rowHint: { fontSize: 13, color: colors.secondaryLabel },
});
