import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { QCard, QLabel } from '@/components/q-screen';
import { QRowCard } from '@/components/q-row-card';
import { Button, colors, Hint } from '@/components/ui';
import { refreshPlus, usePlanState } from '@/features/calendar/calendar-store';
import { plusIntroHref } from '@/features/calendar/plus-intro';
import { useAuth } from '@/lib/auth';

import { InkSwitch } from './ink-switch';
import { setQrewingMember, setQrewingRoom, useEntryQuestions, useQrewingRoom } from './qrewing-api';
import { en } from '@/i18n/en';

const s = en.qrewing.info;

/**
 * Room info "Qrewing AI" section (spec 3.2). Host: the room switches (also the retry path when the switch failed
 * at create time). Members of an AI room: include/stop including my messages, my entry info and People to meet
 * (event rooms).
 */
export function QrewingInfoSection({ roomId, roomType, isHost }: { roomId: string; roomType: string; isHost: boolean }) {
  const router = useRouter();
  const q = useQrewingRoom(roomId);
  // UX2-01: People to meet is Plus on my own plan; a Free user sees that on the row and the tap opens the Plus page.
  const uid = useAuth().session?.user.id;
  // C14: upsell lines only on a confirmed Free plan; their space is held while the plan loads.
  const plan = usePlanState(uid);
  // Spec 9.4 R4: entry info needs questions, which are set only on Create room. Read for anyone in an event room.
  const entryQuestions = useEntryQuestions(roomType === 'event' ? roomId : '');
  const noQuestions = entryQuestions.loaded && !entryQuestions.failed && entryQuestions.questions.length === 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = q.reload;
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function run(action: () => Promise<{ error?: string; offline?: boolean; planLimit?: boolean }>) {
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    // UX2-03: the server says Free (my plan read was stale): read it again and open the Plus page, no error line.
    if (res.planLimit) {
      if (uid) refreshPlus(uid);
      router.push(plusIntroHref('room-ai'));
    } else if (res.error) setError(res.offline ? en.qrewing.errors.network : s.saveFailed);
    q.reload();
  }

  const isEvent = roomType === 'event';
  // Offline: the host sees why the switches are missing (not a switch that reads Off); members see nothing, as
  // in a room without AI.
  if (q.readFailed) {
    if (!isHost) return null;
    return (
      <View style={styles.section}>
        <QLabel>{s.section}</QLabel>
        <Hint tone="error">{s.loadFailed}</Hint>
        <Button title={s.retry} variant="secondary" onPress={reload} />
      </View>
    );
  }
  if (!isHost && !q.aiEnabled) return null;
  const aiOk = q.me?.aiOk ?? false;

  // UX2-53: the host's switch row already says "Qrewing AI", so no header for the host. Members have no switch
  // row, so the header still names their rows (as does the offline state above).
  return (
    <View style={styles.section}>
      {isHost ? null : <QLabel>{s.section}</QLabel>}
      {isHost ? (
        <>
          <QCard row>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{en.qrewing.create.aiLabel}</Text>
              {plan === 'free' ? (
                <Text style={styles.cardSubtitle}>{s.partOfPlus}</Text>
              ) : plan === 'offline' ? (
                <Text style={styles.cardSubtitle}>{en.planPreview.offline}</Text>
              ) : plan === 'loading' ? (
                <Text style={[styles.cardSubtitle, styles.reserved]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {s.partOfPlus}
                </Text>
              ) : null}
            </View>
            {/* UX2-03: room AI is Plus. A Free host's tap on an off switch opens the Plus page and the switch stays
                off; turning AI off always works. */}
            <InkSwitch
              value={q.aiEnabled}
              disabled={busy}
              onValueChange={(v) =>
                v && plan === 'free'
                  ? router.push(plusIntroHref('room-ai'))
                  : run(() => setQrewingRoom(roomId, v, v && isEvent && q.entryRequired))
              }
              accessibilityLabel={en.qrewing.create.aiLabel}
            />
          </QCard>
          {/* UX2-70: with no entry questions the switch could never turn on, so the row and its text are hidden
              (still shown while it is on, so it can be turned off). */}
          {q.aiEnabled && isEvent && !(noQuestions && !q.entryRequired) ? (
            <QCard row>
              <Text style={styles.cardTitle}>{en.qrewing.create.entryLabel}</Text>
              <InkSwitch
                value={q.entryRequired}
                // Turning it off always works; turning it on needs questions (22023 otherwise).
                disabled={busy}
                onValueChange={(v) => run(() => setQrewingRoom(roomId, true, v))}
                accessibilityLabel={en.qrewing.create.entryLabel}
              />
            </QCard>
          ) : null}
        </>
      ) : null}
      {q.aiEnabled ? (
        <>
          <QRowCard
            icon={aiOk ? 'checkmark.circle' : 'circle'}
            title={aiOk ? s.consentOn : s.consentOff}
            subtitle={aiOk ? s.withdraw : s.agree}
            busy={busy}
            onPress={() => run(() => setQrewingMember(roomId, !aiOk, false))}
          />
          {isEvent ? (
            <>
              {/* UX2-70: no entry questions, nothing to edit. */}
              {noQuestions ? null : (
                <QRowCard
                  icon="person.text.rectangle"
                  title={s.editEntry}
                  onPress={() => router.push({ pathname: '/room/[id]/entry', params: { id: roomId } })}
                />
              )}
              <QRowCard
                icon="person.2.wave.2"
                title={s.peopleToMeet}
                subtitle={plan === 'free' ? s.partOfPlus : plan === 'loading' ? ' ' : undefined}
                onPress={() =>
                  plan === 'free'
                    ? router.push(plusIntroHref('meet'))
                    : router.push({ pathname: '/room/[id]/people', params: { id: roomId } })
                }
              />
            </>
          ) : null}
        </>
      ) : null}
      {error ? <Hint tone="error">{error}</Hint> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 12 },
  cardTitle: { flex: 1, fontSize: 16, color: colors.label },
  cardText: { flex: 1, gap: 2 },
  cardSubtitle: { fontSize: 13, color: colors.ink2 },
  reserved: { opacity: 0 },
});
