/**
 * Qrewing Calendar personal event: add ("+"), edit or delete my own event, or confirm one Qrewing read from a
 * sentence (`ask=1` with title/start/end/emoji params). Dates only; saved on this phone.
 */
import { DatePicker, Host } from '@expo/ui/swift-ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { InkIcon, inkIconKey, inkIconLabel } from '@/components/calendar';
import { QField, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, radius } from '@/components/ui';
import { useAnnounce } from '@/features/event/announce';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { useNow } from '@/lib/use-now';

import { checkEvent, editorTarget, EVENT_TITLE_MAX, type PersonalEvent } from './calendar-data';
import { keyToLocalDate, localDateToKey } from './calendar-format';
import { isDateKey, localDateKey } from './calendar-plan';
import { removeEvent, saveEvent, useCalendar } from './calendar-store';

const t = en.calendar;

/** A small curated set; Qrewing's pick is added in front when it isn't in the list. */
export const EVENT_EMOJIS = ['📌', '🎂', '🍽️', '☕', '🏃', '🚴', '⚽', '🎉', '🎵', '📚', '✈️', '🏖️', '🏥', '💼', '🛒', '❤️'];

const EMOJI_SIZE = 48;
const EMOJI_COLUMNS = 6;

/** UX2-55: the gap that puts 6 columns of 48 pt icons edge to edge across `width` (at least 6 pt). */
function emojiColumnGap(width: number): number {
  return Math.max(6, Math.floor((width - EMOJI_COLUMNS * EMOJI_SIZE) / (EMOJI_COLUMNS - 1)));
}

type Params = { id?: string; title?: string; start?: string; end?: string; emoji?: string; ask?: string };

export function EventEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const auth = useAuth();
  const uid = auth.session?.user.id;
  const [kept, setKept] = useState<PersonalEvent | null>(null);
  const target = editorTarget(params.id, useCalendar(uid), kept, !!uid || auth.loading);
  if (target.kind === 'edit' && kept !== target.event) setKept(target.event);
  // C14: wait for the doc before building the form (its fields start from the event once), and say so when the
  // event is gone (deleted, or a stale link) instead of opening a blank form that would save a copy.
  if (target.kind === 'loading') return <ActivityIndicator style={styles.loading} accessibilityLabel={t.loadingEvent} />;
  if (target.kind === 'missing') {
    return (
      <QScreen
        sheet
        title={t.editEvent}
        actions={
          <Button
            title={t.backToCalendar}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/calendar'))}
          />
        }
      >
        <Stack.Screen options={{ title: t.editEvent, headerTitle: '', headerShadowVisible: false }} />
        <Hint>{t.eventGone}</Hint>
      </QScreen>
    );
  }
  return <EventForm uid={uid} params={params} existing={target.kind === 'edit' ? target.event : undefined} />;
}

function EventForm({ uid, params, existing }: { uid: string | undefined; params: Params; existing: PersonalEvent | undefined }) {
  const router = useRouter();
  const today = localDateKey(useNow(60_000));
  const [title, setTitle] = useState(existing?.title ?? params.title ?? '');
  const [start, setStart] = useState(existing?.start ?? (isDateKey(params.start) ? params.start : today));
  const [end, setEnd] = useState(existing?.end ?? (isDateKey(params.end) ? params.end : today));
  const [emoji, setEmoji] = useState(existing?.emoji ?? params.emoji ?? EVENT_EMOJIS[0]);
  const [problem, setProblem] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  useAnnounce(problem, tries);
  // UX2-55: 6 icon columns span the full width (space-between): the column gap is the row's slack over 5.
  const [colGap, setColGap] = useState(6);
  // An emoji outside the grid (a sentence's pick) shows as the grid icon it maps to; it is kept until another is tapped.
  const picked = inkIconKey(emoji);
  const editing = !!existing;

  async function save() {
    if (!uid) return;
    const input = { title, start, end, emoji };
    const p = checkEvent(input);
    if (p) {
      setProblem(t.problems[p]);
      setTries((n) => n + 1);
      return;
    }
    setProblem(null);
    const id = existing?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    // C14: a failed write stays on screen with the error until the next attempt.
    if (!(await saveEvent(uid, id, input))) {
      setProblem(t.saveFailed);
      setTries((n) => n + 1);
      return;
    }
    router.back();
  }

  function confirmDelete() {
    if (!uid || !existing) return;
    Alert.alert(t.deleteConfirm, existing.title, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          setProblem(null);
          void removeEvent(uid, existing.id).then((ok) => {
            if (ok) return router.back();
            setProblem(t.deleteFailed);
            setTries((n) => n + 1);
          });
        },
      },
    ]);
  }

  return (
    <QScreen
      sheet
      title={editing ? t.editEvent : t.newEvent}
      subtitle={params.ask === '1' ? t.askConfirm : undefined}
      actions={
        <>
          {problem ? <Hint tone="error">{problem}</Hint> : null}
          <Button title={t.save} onPress={save} />
          {editing ? <Button title={t.delete} variant="destructive" onPress={confirmDelete} /> : null}
        </>
      }
    >
      <Stack.Screen
        options={{
          title: editing ? t.editEvent : t.newEvent,
          headerTitle: '',
          headerShadowVisible: false,
        }}
      />
      <QField
        label={t.titleLabel}
        placeholder={t.titlePlaceholder}
        value={title}
        onChangeText={setTitle}
        maxLength={EVENT_TITLE_MAX}
        accessibilityLabel={t.titleLabel}
        returnKeyType="done"
      />
      <DateRow label={t.startLabel} value={start} onChange={(k) => {
        setStart(k);
        if (end < k) setEnd(k);
      }} />
      <DateRow label={t.endLabel} value={end} onChange={setEnd} />
      <QLabel>{t.emojiLabel}</QLabel>
      <View
        style={[styles.emojis, { columnGap: colGap }]}
        onLayout={(e) => setColGap(emojiColumnGap(e.nativeEvent.layout.width))}
        accessibilityRole="radiogroup" accessibilityLabel={t.emojiLabel}>
        {EVENT_EMOJIS.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="radio"
            accessibilityLabel={inkIconLabel(e)}
            accessibilityState={{ selected: inkIconKey(e) === picked }}
            onPress={() => setEmoji(e)}
            style={[styles.emoji, inkIconKey(e) === picked && { borderColor: colors.tint, backgroundColor: colors.field }]}
          >
            <InkIcon emoji={e} size={26} />
          </Pressable>
        ))}
      </View>
    </QScreen>
  );
}

function DateRow({ label, value, onChange }: { label: string; value: string; onChange: (key: string) => void }) {
  // UX2-55: the row label is SF body 17 regular; the hand font is for titles only.
  return (
    <View style={styles.dateRow}>
      {/* One label each way: the row Text is the visible one (hidden from VoiceOver); the picker's title is only
          spoken (labelsHidden), so neither the screen nor VoiceOver says "Starts Starts". */}
      <Text style={styles.dateLabel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {label}
      </Text>
      <Host matchContents>
        <DatePicker
          title={label}
          selection={keyToLocalDate(value)}
          displayedComponents={['date']}
          onDateChange={(d) => onChange(localDateToKey(d))}
          modifiers={[labelsHidden()]}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  dateRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 12 },
  dateLabel: { flex: 1, fontSize: 17, color: colors.label },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  emoji: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
