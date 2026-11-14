// Spec 11 C, in Ask Qrewing: questions Qrewing passed on to a person. Waiting, the answer (only I see it), or after
// ~3 minutes with no answer the offer to ask in the room chat instead (the server posts it as my chat message).
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { listMembers } from '@/lib/rooms';

import { canAskInChat, type CardError, cardsIAsked, msUntilOffer, type QuestionCard } from './question-plan';
import { askInChat, loadCards, useRoomCards } from './question-store';

const s = en.questions;

/**
 * UX2-47: my cards in this room (refetched when `refreshKey` changes, after each answer from Qrewing), member names,
 * and a clock that wakes when the next ask-in-chat offer is due. The ask screen threads them under its turns.
 */
export function useMyRelayCards(roomId: string, refreshKey: number, enabled: boolean) {
  const { session } = useAuth();
  const { cards } = useRoomCards(roomId);
  const mine = enabled ? cardsIAsked(cards, session?.user.id) : [];
  const name = useMemberNames(roomId, mine.length);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (enabled) loadCards(roomId);
  }, [roomId, refreshKey, enabled]);

  const nextDue = Math.min(...mine.map((c) => msUntilOffer(c, now)).filter((ms) => ms > 0), Infinity);
  useEffect(() => {
    if (!Number.isFinite(nextDue)) return;
    const t = setTimeout(() => setNow(Date.now()), nextDue + 250);
    return () => clearTimeout(t);
  }, [nextDue]);

  return { mine, name, now };
}

/** Member names by user id, read again when `key` changes. */
function useMemberNames(roomId: string, key: number) {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    let live = true;
    listMembers(roomId)
      .then((m) => live && setNames(new Map(m.map((x) => [x.user_id, x.display_name]))))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [roomId, key]);
  return (uid: string) => names.get(uid) ?? en.chat.formerMember;
}

/**
 * UX2-04b: my answered questions, read only (no ask-in-chat, no composer), for a Free asker. Reading a person's
 * answer is never behind Plus. Nothing when there are none.
 */
export function AnsweredCards({ roomId }: { roomId: string }) {
  const { session } = useAuth();
  const { cards } = useRoomCards(roomId);
  const answered = cardsIAsked(cards, session?.user.id).filter((c) => c.status === 'answered');
  const name = useMemberNames(roomId, answered.length);
  useEffect(() => {
    loadCards(roomId);
  }, [roomId]);
  if (answered.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {answered.map((c) => (
        <AnsweredCard key={c.id} card={c} answerer={name(c.answererId)} />
      ))}
    </View>
  );
}

/** UX2-04b: one answered question: my bubble, then the answer with the answerer's name and time. */
export function AnsweredCard({ card, answerer, onSheet }: { card: QuestionCard; answerer: string; onSheet?: boolean }) {
  const at = card.answeredAt ? new Date(card.answeredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  const by = at ? s.answerBy(answerer, at) : answerer;
  return (
    <View style={styles.card}>
      <View style={[styles.bubble, styles.mine]} accessible accessibilityLabel={`${en.qrewing.ask.you}: ${card.question}`}>
        <Text style={[styles.text, { color: colors.onTint }]} selectable>
          {card.question}
        </Text>
      </View>
      <View style={[styles.bubble, styles.bot, onSheet && styles.botOnSheet]} accessible accessibilityLabel={`${by}: ${card.answer ?? ''}`}>
        <Text style={styles.by}>{by}</Text>
        <Text style={styles.text} selectable>
          {card.answer}
        </Text>
      </View>
    </View>
  );
}

/**
 * UX2-47: what happened to a question Qrewing passed on, shown under Qrewing's reply in the same thread: a caption
 * while waiting, the person's answer as its own bubble, the ask-in-chat offer, or the moved-to-chat note.
 */
export function RelayState({ card, answerer, now }: { card: QuestionCard; answerer: string; now: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CardError | null>(null);

  async function move() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await askInChat(card.id);
    setBusy(false);
    if ('error' in res) setError(res.error);
  }

  return (
    <>
      {card.status === 'answered' ? (
        <View
          style={[styles.bubble, styles.bot]}
          accessible
          accessibilityLabel={`${s.answerFrom(answerer)}: ${card.answer ?? ''}`}
        >
          <Text style={styles.by}>{s.answerFrom(answerer)}</Text>
          <Text style={styles.text} selectable>
            {card.answer}
          </Text>
        </View>
      ) : card.status === 'asked_in_chat' ? (
        <Text style={styles.note}>{s.movedToChat}</Text>
      ) : canAskInChat(card, now) ? (
        <View style={styles.offer} accessibilityLiveRegion="polite">
          <Text style={styles.note}>{s.noAnswer(answerer)}</Text>
          <Button title={s.askInChat} variant="secondary" onPress={move} busy={busy} />
        </View>
      ) : (
        <Text style={styles.note}>{s.askedWaiting(answerer)}</Text>
      )}
      {error ? <Hint tone="error">{s.errors[error]}</Hint> : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { gap: 8 },
  bubble: { maxWidth: '85%', borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.tint },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.field, gap: 2 },
  // UX2-45: on a sheet the answer bubble is cardStrong (card would match the dark sheet).
  botOnSheet: { backgroundColor: colors.fieldStrong },
  by: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  text: { fontSize: 16, color: colors.label },
  note: { fontSize: 14, color: colors.ink2 },
  offer: { gap: 8 },
});
