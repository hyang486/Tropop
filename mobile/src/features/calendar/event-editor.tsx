/**
 * Trok Calendar personal event: add ("+"), edit or delete my own event, or confirm one Trok read from a
 * sentence (`ask=1` with title/start/end/emoji params). UX3-A13: a start and end time unless All day; saved on this phone.
 */
import { DatePicker, Host } from '@expo/ui/swift-ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { InkIcon, inkIconKey, inkIconLabel } from '@/components/calendar';
import { QField, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, radius } from '@/components/ui';
import { useAnnounce } from '@/features/event/announce';
import { InkSwitch } from '@/features/event/ink-switch';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';

import { checkEvent, editorTarget, EVENT_TITLE_MAX, type PersonalEvent } from './calendar-data';
import { defaultEventTimes, endAfterStart, keyTimeToLocalDate, localDateToKeyTime } from './calendar-format';
import { removeEvent, saveEvent, useCalendar } from './calendar-store';
import { editorPrefill, type EditorParams } from './editor-prefill';

const t = en.calendar;

/** A small curated set; Trok's pick is added in front when it isn't in the list. */
export const EVENT_EMOJIS = ['📌', '🎂', '🍽️', '☕', '🏃', '🚴', '⚽', '🎉', '🎵', '📚', '✈️', '🏖️', '🏥', '💼', '🛒', '❤️'];

const EMOJI_SIZE = 48;
const EMOJI_COLUMNS = 6;

/** UX2-55: the gap that puts 6 columns of 48 pt icons edge to edge across `width` (at least 6 pt). */
function emojiColumnGap(width: number): number {
  return Math.max(6, Math.floor((width - EMOJI_COLUMNS * EMOJI_SIZE) / (EMOJI_COLUMNS - 1)));
}

type Params = EditorParams;

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
        inlineTitle
        title={t.editEvent}
        actions={
          <Button
            title={t.backToCalendar}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/calendar'))}
          />
        }
      >
        <Stack.Screen options={{ title: t.editEvent, headerShadowVisible: false }} />
        <Hint>{t.eventGone}</Hint>
      </QScreen>
    );
  }
  return <EventForm uid={uid} params={params} existing={target.kind === 'edit' ? target.event : undefined} />;
}

function EventForm({ uid, params, existing }: { uid: string | undefined; params: Params; existing: PersonalEvent | undefined }) {
  const router = useRouter();
  // UX3-A13: a new event starts at the next full hour and lasts an hour; read once when the form opens.
  // Params (ask=1, a day-detail copy, an empty day's date) are read once when the form opens.
  const [init] = useState(() => editorPrefill(params, defaultEventTimes(new Date())));
  const [title, setTitle] = useState(existing?.title ?? init.title);
  const [start, setStart] = useState(existing?.start ?? init.start);
  const [end, setEnd] = useState(existing?.end ?? init.end);
  // Existing events without a time, Trok's date-only picks and all-day copies open as all day.
  const [allDay, setAllDay] = useState(existing ? !existing.startTime : init.allDay);
  const [startTime, setStartTime] = useState(existing?.startTime ?? init.startTime);
  const [endTime, setEndTime] = useState(existing?.endTime ?? init.endTime);
  const [emoji, setEmoji] = useState(existing?.emoji ?? init.emoji ?? EVENT_EMOJIS[0]);
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
    const input = allDay ? { title, start, end, emoji } : { title, start, end, emoji, startTime, endTime };
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
      inlineTitle
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
          headerShadowVisible: false,
        }}
      />
      <QField
        label={t.titleLabel}
        labelAbove
        placeholder={t.titlePlaceholder}
        value={title}
        onChangeText={setTitle}
        maxLength={EVENT_TITLE_MAX}
        accessibilityLabel={t.titleLabel}
        returnKeyType="done"
      />
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {t.allDayLabel}
        </Text>
        <InkSwitch value={allDay} onValueChange={setAllDay} accessibilityLabel={t.allDayLabel} />
      </View>
      <DateRow
        label={t.startLabel}
        date={start}
        time={startTime}
        allDay={allDay}
        onChange={(k, tm) => {
          setStart(k);
          setStartTime(tm);
          // Keep the end after the start: the same date when all day, one hour later when timed.
          const kept = endAfterStart(k, tm, end, endTime, allDay);
          setEnd(kept.end);
          setEndTime(kept.endTime);
        }}
      />
      <DateRow
        label={t.endLabel}
        date={end}
        time={endTime}
        allDay={allDay}
        onChange={(k, tm) => {
          // ux P1: an end picked before the start moves the same way.
          const kept = endAfterStart(start, startTime, k, tm, allDay);
          setEnd(kept.end);
          setEndTime(kept.endTime);
        }}
      />
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
            style={[styles.emoji, inkIconKey(e) === picked && { backgroundColor: colors.tint }]}
          >
            <InkIcon emoji={e} size={26} color={inkIconKey(e) === picked ? colors.onTint : undefined} />
          </Pressable>
        ))}
      </View>
    </QScreen>
  );
}

type DateRowProps = {
  label: string;
  date: string;
  time: string;
  allDay: boolean;
  onChange: (date: string, time: string) => void;
};

function DateRow({ label, date, time, allDay, onChange }: DateRowProps) {
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
          selection={keyTimeToLocalDate(date, allDay ? undefined : time)}
          displayedComponents={allDay ? ['date'] : ['date', 'hourAndMinute']}
          onDateChange={(d) => {
            const picked = localDateToKeyTime(d);
            // All day: only the date changed; keep the stored time for when All day is turned off.
            onChange(picked.date, allDay ? time : picked.time);
          }}
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
  },
});
