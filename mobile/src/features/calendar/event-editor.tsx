/**
 * Qrewing Calendar personal event: add ("+"), edit or delete my own event, or confirm one Qrewing read from a
 * sentence (`ask=1` with title/start/end/emoji params). Dates only; saved on this phone.
 */
import { DatePicker, Host } from '@expo/ui/swift-ui';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { QField, QLabel, QScreen } from '@/components/q-screen';
import { Button, colors, Hint, radius } from '@/components/ui';
import { useAnnounce } from '@/features/event/announce';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { useNow } from '@/lib/use-now';

import { checkEvent, EVENT_TITLE_MAX } from './calendar-data';
import { keyToLocalDate, localDateToKey } from './calendar-format';
import { isDateKey, localDateKey } from './calendar-plan';
import { removeEvent, saveEvent, useCalendar } from './calendar-store';

const t = en.calendar;

/** A small curated set; Qrewing's pick is added in front when it isn't in the list. */
export const EVENT_EMOJIS = ['📌', '🎂', '🍽️', '☕', '🏃', '🚴', '⚽', '🎉', '🎵', '📚', '✈️', '🏖️', '🏥', '💼', '🛒', '❤️'];

export function EventEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string; start?: string; end?: string; emoji?: string; ask?: string }>();
  const uid = useAuth().session?.user.id;
  const doc = useCalendar(uid);
  const existing = params.id ? doc?.events.find((e) => e.id === params.id) : undefined;
  const today = localDateKey(useNow(60_000));
  const [title, setTitle] = useState(existing?.title ?? params.title ?? '');
  const [start, setStart] = useState(existing?.start ?? (isDateKey(params.start) ? params.start : today));
  const [end, setEnd] = useState(existing?.end ?? (isDateKey(params.end) ? params.end : today));
  const [emoji, setEmoji] = useState(existing?.emoji ?? params.emoji ?? EVENT_EMOJIS[0]);
  const [problem, setProblem] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  useAnnounce(problem, tries);
  const emojis = EVENT_EMOJIS.includes(emoji) ? EVENT_EMOJIS : [emoji, ...EVENT_EMOJIS];
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
    await saveEvent(uid, existing?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, input);
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
          void removeEvent(uid, existing.id).then(() => router.back());
        },
      },
    ]);
  }

  return (
    <QScreen
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
      <Stack.Screen options={{ title: editing ? t.editEvent : t.newEvent, headerTitle: '' }} />
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
      <View style={styles.emojis} accessibilityRole="radiogroup" accessibilityLabel={t.emojiLabel}>
        {emojis.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="radio"
            accessibilityLabel={e}
            accessibilityState={{ selected: e === emoji }}
            onPress={() => setEmoji(e)}
            style={[styles.emoji, e === emoji && { borderColor: colors.tint, backgroundColor: colors.field }]}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>
    </QScreen>
  );
}

function DateRow({ label, value, onChange }: { label: string; value: string; onChange: (key: string) => void }) {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Host matchContents>
        <DatePicker
          title={label}
          selection={keyToLocalDate(value)}
          displayedComponents={['date']}
          onDateChange={(d) => onChange(localDateToKey(d))}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 12 },
  dateLabel: { flex: 1, fontSize: 16, color: colors.label },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emoji: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiText: { fontSize: 26 },
});
