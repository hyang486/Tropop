import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Avatar } from '@/components/avatar';
import { HandTitle } from '@/components/hand-title';
import { EmptyState } from '@/components/empty-state';
import { QCard, QScreen } from '@/components/q-screen';
import { refreshPlus, usePlanState } from '@/features/calendar/calendar-store';
import { plusIntroHref } from '@/features/calendar/plus-intro';
import { Button, colors, Hint } from '@/components/ui';

import { DisclosureSheet } from './disclosure-sheet';
import { listEntryProfiles } from './entry-api';
import { linksByUser } from './event-plan';
import { peopleEmpty, peopleGate } from './people-empty';
import {
  type MatchResult,
  type QrewingError,
  requestMatches,
  useEntryQuestions,
  useQrewingRoom,
} from './qrewing-api';
import { isPlanLimit, matchStep } from './qrewing-plan';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { listMembers } from '@/lib/rooms';

const s = en.qrewing.people;

type State =
  | { status: 'loading' }
  | {
      status: 'ready';
      result: MatchResult;
      links: ReadonlyMap<string, string[]>;
      updating: boolean;
      /** No re-ask follows: the copy says to tap Refresh (R5). */
      final: boolean;
      /** A failed re-ask: the kept list shows with this line (R4). */
      error: QrewingError | null;
    }
  | { status: 'pending'; final: boolean }
  | { status: 'error'; error: QrewingError };

type Loaded = { state: State; retryInMs: number | null };

async function load(roomId: string, last: MatchResult | null, isRetry: boolean): Promise<Loaded> {
  const [res, profiles] = await Promise.all([requestMatches(roomId), listEntryProfiles(roomId).catch(() => [])]);
  const step = matchStep(res, last, isRetry);
  if (step.show === 'error') return { state: { status: 'error', error: step.error }, retryInMs: null };
  const final = step.retryInMs === null;
  if (step.show === 'pending') return { state: { status: 'pending', final }, retryInMs: step.retryInMs };
  return {
    state: { status: 'ready', result: step.result, links: linksByUser(profiles), updating: step.pending, final, error: step.error },
    retryInMs: step.retryInMs,
  };
}

/**
 * People to meet (spec 3.2): Trok's suggestions from entry info, with each person's headline, the reason and
 * their links. Refresh asks again; the server reuses a list younger than 10 minutes and marks it stale.
 */
export function PeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQrewingRoom(id);
  const uid = useAuth().session?.user.id;
  // UX2-01: Free (known) → the Plus gate with no request; Free → Plus re-runs the effect, so the list loads after an upgrade.
  // C14: only a confirmed Free plan gates; loading or offline lets the list read answer (its own offline error).
  const plan = usePlanState(uid);
  const skip = plan === 'free';
  const [state, setState] = useState<State>({ status: 'loading' });
  // The consent gate's Agree opens the disclosure first, like every other consent entry; the sheet saves the answer.
  const [consent, setConsent] = useState(false);
  // Only the newest request may set the state (a Refresh after leaving, or two quick taps, must not).
  const latest = useRef(0);
  // The last list shown, kept while a 202 pending answer is re-asked.
  const lastList = useRef<MatchResult | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    const ask = (isRetry: boolean) => {
      const n = ++latest.current;
      load(id, lastList.current, isRetry).then(({ state: next, retryInMs }) => {
        if (latest.current !== n) return;
        if (next.status === 'ready') lastList.current = next.result;
        // A 402 means my plan read was stale (a lapse, or still loading): read it again.
        if (next.status === 'error' && isPlanLimit(next.error) && uid) refreshPlus(uid);
        setState(next);
        // One re-ask after a pending answer; the re-ask itself never schedules another (isRetry).
        if (retryInMs !== null) retryTimer.current = setTimeout(() => ask(true), retryInMs);
      });
    };
    ask(false);
  }, [id, uid]);

  useEffect(() => {
    const req = latest;
    lastList.current = null;
    if (!skip) run();
    return () => {
      req.current++;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
    };
  }, [run, skip]);

  const refresh = useCallback(() => {
    setState({ status: 'loading' });
    run();
  }, [run]);

  // Spec 11 A15: each suggestion shows the member's profile photo (or initial). A failed read keeps the initials.
  const [avatars, setAvatars] = useState<ReadonlyMap<string, string | null>>(new Map());
  // UX2-137: the same read tells whether I am the host (for the no-questions wording).
  const [hostId, setHostId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    listMembers(id)
      .then((members) => {
        if (!live) return;
        setAvatars(new Map(members.map((m) => [m.user_id, m.avatar_path])));
        setHostId(members.find((m) => m.role === 'host')?.user_id ?? null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);

  const notConsented = q.me !== null && !q.me.aiOk;
  const noQuestionsBody = !!uid && hostId === uid ? s.noQuestionsHost : s.noQuestions;
  // A failed re-ask on a kept list counts too: if Trok went off or I left, the old list must not stay up.
  const gate = peopleGate({
    plus: plan === 'free' ? false : plan === 'plus' ? true : null,
    error: state.status === 'error' || state.status === 'ready' ? state.error : null,
    notConsented,
  });
  // UX2-09: not_member (left or removed) closes the screen, like Ask does.
  // UX2-129: an alert says why first (once per visit); the screen closes on OK.
  const left = gate === 'left';
  const leftAlerted = useRef(false);
  useEffect(() => {
    if (!left || leftAlerted.current) return;
    leftAlerted.current = true;
    Alert.alert(
      s.notMemberTitle,
      s.notMemberMessage,
      [{ text: s.notMemberOk, onPress: () => router.canGoBack() && router.back() }],
      { cancelable: false },
    );
  }, [left, router]);
  const questions = useEntryQuestions(id);
  const empty = peopleEmpty({
    status: state.status,
    error: state.status === 'error' || state.status === 'ready' ? state.error : null,
    matches: state.status === 'ready' ? state.result.matches.length : 0,
    notConsented,
    questions: { loaded: questions.loaded, failed: questions.failed, count: questions.questions.length },
  });

  return (
    <QScreen
      actions={
        gate === 'plus' ? (
          <Button
            title={en.planPreview.seePlus}
            accessibilityHint={s.seePlusHint}
            onPress={() => router.push(plusIntroHref('meet'))}
          />
        ) : gate === 'off' || gate === 'unavailable' ? (
          <Button title={s.back} variant="secondary" onPress={() => router.back()} />
        ) : gate === 'left' ? undefined : gate === 'consent' ? (
          <Button title={s.agree} onPress={() => setConsent(true)} />
        ) : empty === 'noQuestions' ? undefined : empty === 'noEntry' ? (
          <Button
            title={en.qrewing.info.addEntry}
            onPress={() => router.push({ pathname: '/room/[id]/entry', params: { id } })}
          />
        ) : (
          <Button title={s.refresh} variant="secondary" onPress={refresh} busy={state.status === 'loading'} />
        )
      }
    >
      {/* Spec 11 A15: the handwritten title sits up in the header instead of under it. */}
      <Stack.Screen
        options={{
          title: s.title,
          headerTitle: () => <HandTitle style={styles.headerTitle}>{s.title}</HandTitle>,
        }}
      />
      <DisclosureSheet
        roomId={id}
        visible={consent}
        onDone={() => {
          setConsent(false);
          refresh();
        }}
        onClose={() => setConsent(false)}
      />
      {gate === 'plus' ? (
        <EmptyState art="meetup" artWidth={160} title={s.plusTitle} body={s.plus} />
      ) : gate === 'off' || gate === 'unavailable' ? (
        <EmptyState art="meetup" artWidth={160} title={gate === 'off' ? s.off : s.unavailable} />
      ) : gate === 'left' ? null : gate === 'consent' ? (
        <EmptyState art="meetup" artWidth={160} title={s.consentTitle} body={s.notConsented} />
      ) : state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Hint>{s.loading}</Hint>
        </View>
      ) : state.status === 'pending' ? (
        <Hint>{state.final ? s.pendingFinal : s.pending}</Hint>
      ) : state.status === 'error' ? (
        empty === 'noQuestions' ? (
          <EmptyState art="meetup" title={s.noQuestionsTitle} body={noQuestionsBody} />
        ) : empty === 'noEntry' ? (
          <EmptyState art="meetup" title={s.noEntryTitle} body={s.noEntry} />
        ) : (
          // A real error (network, AI failed...): red with Refresh, since a retry can work. Plan and consent are gates.
          <Hint tone="error">{en.qrewing.errors[state.error]}</Hint>
        )
      ) : empty === 'noQuestions' ? (
        <EmptyState art="meetup" title={s.noQuestionsTitle} body={noQuestionsBody} />
      ) : state.result.matches.length === 0 ? (
        <EmptyState art="meetup" title={s.emptyTitle} body={s.empty} />
      ) : (
        <>
          {state.error ? (
            <Hint tone="error">{state.error === 'network' ? en.qrewing.errors.network : s.updateFailed}</Hint>
          ) : state.updating ? (
            <Hint>{state.final ? s.updatingFinal : s.updating}</Hint>
          ) : state.result.stale ? (
            <Hint>{s.stale}</Hint>
          ) : null}
          {state.result.matches.map((m) => (
            <QCard key={m.userId}>
              <View style={styles.who}>
                <Avatar path={avatars.get(m.userId)} name={m.displayName} size={40} />
                <View style={styles.whoText}>
                  <Text style={styles.name} accessibilityRole="header">{m.displayName}</Text>
                  {m.headline ? <Text style={styles.headline}>{m.headline}</Text> : null}
                </View>
              </View>
              <Text style={styles.reason}>{m.reason}</Text>
              {(state.links.get(m.userId) ?? []).map((url) => (
                <Pressable key={url} onPress={() => Linking.openURL(url).catch(() => {})} accessibilityRole="link" style={styles.linkHit}>
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

/** UI audit 7: a neutral empty state; the screen's one pinned action is its CTA. */
const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  headerTitle: { fontSize: 24, lineHeight: 30 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whoText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600', color: colors.label },
  headline: { fontSize: 15, color: colors.ink2 },
  reason: { fontSize: 15, color: colors.label, marginTop: 4 },
  link: { fontSize: 15, color: colors.tint, textDecorationLine: 'underline' },
  // UX2-35: each link row is a 44 pt target; the text keeps its size.
  linkHit: { minHeight: 44, justifyContent: 'center' },
});
