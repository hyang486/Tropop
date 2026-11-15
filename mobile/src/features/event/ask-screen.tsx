// Private Trok chat (spec 10.1, 10.4): route `room/[id]/ask`. Only the asker sees it; nothing is posted to the
// room, and the history stays on this phone (ask-store).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '@/lib/dialogs';
import { Text } from '@/components/text';

import { EmptyState } from '@/components/empty-state';
import { useAnnounce } from '@/features/event/announce';
import { AnsweredCards, RelayState, useMyRelayCards } from '@/features/questions/relayed-cards';
import { Composer } from '@/components/composer';
import { QScreen, type QScreenReveal } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { paceSnapshot, paceStartPoint } from '@/features/pace/engine';
import { en } from '@/i18n/en';
import { myFirstSharedPoint } from '@/lib/location';
import { supabase } from '@/lib/supabase';

import { refreshPlus } from '@/features/calendar/calendar-store';
import { plusIntroHref } from '@/features/calendar/plus-intro';
import { useAuth } from '@/lib/auth';

import { ASK_FAKE, fakeAskInvoke } from './ask-fake';
import { type AskError, ASK_LIMITS, askAnchor, askQuestion, type AskTurn, threadCards } from './ask-plan';
import { appendAskTurn, loadAskHistory, purgeAskHistory } from './ask-store';
import { DisclosureSheet } from './disclosure-sheet';
import { isPlanLimit } from './qrewing-plan';
import { askQrewing, useQrewingRoom } from './qrewing-api';

const s = en.qrewing.ask;
const qs = en.questions;

export function AskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  // With room AI off (a Plus asker, capacity B item 4) Trok relays no questions, so no relayed cards.
  const roomAi = useQrewingRoom(id).aiEnabled;
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const relay = useMyRelayCards(id, turns.length, !!roomAi);
  const threads = threadCards(turns, relay.mine);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  // The question waiting for its answer (shown as my bubble plus "thinking").
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<AskError | null>(null);
  const [consent, setConsent] = useState(false);
  // UX2-04: the ask came back plan_limit (a Free asker): the Plus empty state replaces the chat and the composer.
  const [plusGate, setPlusGate] = useState(false);
  useAnnounce(sending ? s.thinking : null, sending);
  const errorText =
    error === 'ask_limit' ? s.limitReached : error === 'rate_limited' ? s.rateLimited : error ? en.qrewing.errors[error] : null;
  useAnnounce(errorText, error);
  const mounted = useRef(true);
  const lastRef = useRef<ComponentRef<typeof View>>(null);
  const revealRef = useRef<QScreenReveal>(null);

  useEffect(() => {
    mounted.current = true;
    loadAskHistory(id).then((h) => {
      if (!mounted.current) return;
      setTurns(h);
      setLoaded(true);
    });
    return () => {
      mounted.current = false;
    };
  }, [id]);

  // The newest bubble (or the thinking line, or the error) stays in view.
  useEffect(() => {
    if (lastRef.current) revealRef.current?.(lastRef.current);
  }, [loaded, turns.length, sending, error]);

  async function send() {
    const q = askQuestion(draft);
    if (!q || sending) return;
    setSending(q);
    setDraft('');
    setError(null);
    const mine = await myAskContext(id);
    const res = await askQrewing(id, q, turns, mine.me, ASK_FAKE ? fakeAskInvoke : undefined, mine.anchor);
    if ('error' in res) {
      if (res.error === 'not_member') {
        // Spec 10.4: no longer in the room, so its history goes and the modal closes.
        // UX2-129: say why first; the modal closes on OK.
        await purgeAskHistory(id);
        if (mounted.current) {
          Alert.alert(s.notMemberTitle, s.notMemberMessage, [{ text: s.notMemberOk, onPress: () => router.back() }], {
            cancelable: false,
          });
        }
        return;
      }
      if (!mounted.current) return;
      if (isPlanLimit(res.error)) {
        // capacity B item 4, UX2-04: Free caller → re-read the plan and show the Plus empty state (See Plus).
        if (userId) refreshPlus(userId);
        setPlusGate(true);
        setSending(null);
        return;
      }
      setError(res.error);
      // The question is not lost: it goes back into the composer unless something new was typed.
      setDraft((cur) => cur || q);
      setSending(null);
      return;
    }
    const next = await appendAskTurn(id, {
      q,
      a: res.answer,
      at: Date.now(),
      ...(res.cardId ? { cardId: res.cardId } : {}),
    });
    if (!mounted.current) return;
    setTurns(next);
    setSending(null);
  }

  // UX2-10: after the daily cap, Send stays off on this screen (the cap is a rolling day; reopening asks the server again).
  const canSend = !!askQuestion(draft) && !sending && loaded && error !== 'ask_limit';
  const lastIndex = turns.length - 1;
  return (
    <QScreen
      sheet
      title={s.title}
      subtitle={s.intro}
      revealRef={revealRef}
      actions={
        plusGate ? (
          <Button title={en.planPreview.seePlus} accessibilityHint={s.seePlusHint} onPress={() => router.push(plusIntroHref('ask'))} />
        ) : (
          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={send}
            placeholder={s.placeholder}
            sendLabel={s.send}
            canSend={canSend}
            busy={!!sending}
            maxLength={ASK_LIMITS.question}
          />
        )
      }
    >
      <Stack.Screen
        options={{
          title: s.title,
          headerTitle: '',
          // A visible way out besides the swipe (VoiceOver users cannot discover it).
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={s.doneLabel} onPress={() => router.back()} style={styles.headerHit}>
              <Text style={styles.done}>{s.done}</Text>
            </Pressable>
          ),
        }}
      />
      {plusGate ? (
        <>
          {/* UX2-04b: answers people gave to my questions stay readable on Free. */}
          <AnsweredCards roomId={id} />
          <EmptyState art="meetup" artWidth={160} title={s.plusTitle} body={s.plusBody} />
        </>
      ) : !loaded ? (
        <ActivityIndicator />
      ) : (
        <>
          {turns.length === 0 && !sending ? <Hint>{s.empty}</Hint> : null}
          {/* Spec 11 C, UX2-47: a question Trok passed on to a person keeps one thread: my question, Trok's
              reply, then the waiting caption, the person's answer or the ask-in-chat offer under it. */}
          {threads.rest.map((c) => (
            <View key={c.id} style={styles.turn}>
              <Bubble mine text={c.question} />
              <Bubble text={qs.askedReply(relay.name(c.answererId))} />
              <RelayState card={c} answerer={relay.name(c.answererId)} now={relay.now} />
            </View>
          ))}
          {turns.map((t, i) => {
            const card = threads.byTurn[i];
            return (
              <View key={`${t.at}:${i}`} style={styles.turn} ref={i === lastIndex && !sending && !error ? lastRef : undefined}>
                <Bubble mine text={t.q} />
                <Bubble text={card ? qs.askedReply(relay.name(card.answererId)) : t.a} />
                {card ? <RelayState card={card} answerer={relay.name(card.answererId)} now={relay.now} /> : null}
              </View>
            );
          })}
          {sending ? (
            <View style={styles.turn} ref={!error ? lastRef : undefined}>
              <Bubble mine text={sending} />
              <Text style={styles.thinking} accessibilityLiveRegion="polite">
                {s.thinking}
              </Text>
            </View>
          ) : null}
          {error ? (
            <View ref={lastRef} style={styles.turn}>
              <Hint tone={error === 'ask_limit' ? undefined : 'error'}>{errorText}</Hint>
              {error === 'not_consented' ? (
                <Button title={s.reviewConsent} variant="secondary" onPress={() => setConsent(true)} />
              ) : null}
            </View>
          ) : null}
        </>
      )}
      <DisclosureSheet
        roomId={id}
        visible={consent}
        onDone={() => {
          setConsent(false);
          setError(null);
        }}
        onClose={() => setConsent(false)}
      />
    </QScreen>
  );
}

/**
 * My own activity in this room for `me` (spec 10.3), and the progress `anchor` (bug b: the place pin, else my own
 * start point, else s11: my first point shared in this room); nothing when the room read fails.
 */
async function myAskContext(roomId: string) {
  try {
    const { data } = await supabase
      .from('rooms')
      .select('id, activity_state, activity_seq, place_lat, place_lng')
      .eq('id', roomId)
      .maybeSingle();
    if (!data) return { me: null, anchor: undefined };
    const place = data.place_lat != null && data.place_lng != null ? { latitude: data.place_lat, longitude: data.place_lng } : null;
    return { me: paceSnapshot(data), anchor: askAnchor(place, paceStartPoint(data), myFirstSharedPoint(roomId)) };
  } catch {
    return { me: null, anchor: undefined };
  }
}

function Bubble({ text, mine }: { text: string; mine?: boolean }) {
  return (
    <View
      style={[styles.bubble, mine ? styles.mine : styles.bot]}
      accessible
      accessibilityLabel={`${mine ? s.you : s.bot}: ${text}`}
    >
      <Text style={[styles.text, mine && { color: colors.onTint }]} selectable>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerHit: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  done: { fontSize: 17, fontWeight: '600', color: colors.tint, paddingHorizontal: 6 },
  turn: { gap: 8 },
  bubble: { maxWidth: '85%', borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.tint },
  // UX2-48: Ask is a pageSheet, so Trok's bubble is sheetField, the card on the sheet ground.
  bot: { alignSelf: 'flex-start', backgroundColor: colors.sheetField },
  text: { fontSize: 16, color: colors.label },
  thinking: { fontSize: 14, color: colors.ink2 },
});
