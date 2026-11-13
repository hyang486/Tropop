/**
 * Qrewing Calendar (Plus preview, human FINAL 2026-11-13): a hand-drawn month with my rooms (hosted or joined;
 * past, current, future) as highlighter strokes and my own events. Phone-only data. "+" adds an event, the
 * Qrewing button adds one from a sentence, and a past room's emoji opens its diary card.
 */
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DiaryCard,
  HighlighterStroke,
  highlighterFor,
  primarySegments,
  SketchyMonthGrid,
  useCalendarColors,
} from '@/components/calendar';
import { QCard, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { useAnnounce } from '@/features/event/announce';
import { calendarAdd } from '@/features/event/qrewing-api';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { useNow } from '@/lib/use-now';

import { calendarGate, calendarItems, parseCalendarAdd, type RoomSnapshot } from './calendar-data';
import { dayTitle, diaryText, monthTitle, rangeLabel, weekdayLabels } from './calendar-format';
import {
  type CalItem,
  cellOf,
  type DateKey,
  isPastRoom,
  itemsOnDay,
  keyOf,
  layoutMonth,
  localDateKey,
  MAX_LANES,
  monthGrid,
  overflowByDay,
  shiftMonth,
} from './calendar-plan';
import { useCalendar, usePlusPreview } from './calendar-store';

const t = en.calendar;
const ART = require('../../../assets/images/icon.png');
const CELL_H = 74;
const DAY_H = 20;
const STROKE_H = 14;
const LANE_PITCH = STROKE_H + 2;

export function CalendarScreen() {
  const router = useRouter();
  const uid = useAuth().session?.user.id;
  const gate = calendarGate(usePlusPreview(uid), !!uid);
  if (gate === 'loading') return <ActivityIndicator style={styles.loading} />;
  if (gate === 'upsell') {
    return (
      <QScreen title={t.title}>
        <QCard>
          <Text style={styles.upsellTitle} accessibilityRole="header">
            {t.upsellTitle}
          </Text>
          <Hint>{t.upsellBody}</Hint>
        </QCard>
        <Button title={t.upsellCta} onPress={() => router.push('/plan-preview')} />
      </QScreen>
    );
  }
  return <CalendarMonth uid={uid!} />;
}

function CalendarMonth({ uid }: { uid: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useCalendarColors();
  const doc = useCalendar(uid);
  const now = useNow(60_000);
  const today = localDateKey(now);
  const [month, setMonth] = useState(() => ({ year: +today.slice(0, 4), month0: +today.slice(5, 7) - 1 }));
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<DateKey | null>(null);
  const [diary, setDiary] = useState<RoomSnapshot | null>(null);
  const [asking, setAsking] = useState(false);

  const grid = useMemo(() => monthGrid(month.year, month.month0), [month]);
  const items = useMemo(() => (doc ? calendarItems(doc) : []), [doc]);
  const segments = useMemo(() => layoutMonth(items, grid), [items, grid]);
  const overflow = useMemo(() => overflowByDay(segments, grid), [segments, grid]);
  const shown = useMemo(() => segments.filter((s) => s.lane < MAX_LANES), [segments]);
  const a11yFirst = useMemo(() => primarySegments(shown), [shown]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const weekdays = useMemo(() => weekdayLabels(0), []);
  const cellW = width / 7;
  const thisYear = +today.slice(0, 4);

  function roomOf(item: CalItem): RoomSnapshot | null {
    return item.kind === 'room' && doc ? (doc.rooms[item.id.slice('room:'.length)] ?? null) : null;
  }

  function isPast(item: CalItem): boolean {
    const room = roomOf(item);
    return !!room && isPastRoom(room, now);
  }

  function openItem(item: CalItem) {
    const room = roomOf(item);
    if (room && isPastRoom(room, now)) return setDiary(room);
    if (item.kind === 'event') return router.push({ pathname: '/calendar-event', params: { id: item.id.slice('event:'.length) } });
    setSelected(item.start < keyOf(grid.year, grid.month0, 1) ? keyOf(grid.year, grid.month0, 1) : item.start);
  }

  function itemLabel(item: CalItem): string {
    return t.itemLabel(item.title, rangeLabel(item.start, item.end, thisYear), isPast(item));
  }

  const go = (by: number) => {
    setMonth((m) => shiftMonth(m.year, m.month0, by));
    setSelected(null);
  };
  const dayItems = selected ? itemsOnDay(items, selected) : [];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.add}
              onPress={() => router.push('/calendar-event')}
              style={styles.headerIcon}
            >
              <SymbolView name="plus" size={22} tintColor={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <QScreen
        title={t.title}
        floating={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.ask}
            onPress={() => setAsking(true)}
            style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 12, right: insets.right + 16 }]}
          >
            <Image source={ART} style={styles.fabArt} contentFit="cover" accessibilityIgnoresInvertColors />
            <View style={styles.fabRing} pointerEvents="none" />
          </Pressable>
        }
      >
        <View style={styles.nav}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.prevMonth} onPress={() => go(-1)} style={styles.navBtn}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.label} />
          </Pressable>
          <Text style={styles.month} accessibilityRole="header">
            {monthTitle(grid.year, grid.month0)}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t.nextMonth} onPress={() => go(1)} style={styles.navBtn}>
            <SymbolView name="chevron.right" size={20} tintColor={colors.label} />
          </Pressable>
        </View>
        <View style={styles.weekdays} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {weekdays.map((w, i) => (
            <Text key={i} style={styles.weekday}>
              {w}
            </Text>
          ))}
        </View>
        <View
          style={[styles.grid, { height: grid.rows * CELL_H, backgroundColor: palette.paper }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {width > 0 ? (
            <>
              <SketchyMonthGrid weeks={grid.rows} cellWidth={cellW} cellHeight={CELL_H} seed={`${grid.year}-${grid.month0}`} />
              {Array.from({ length: grid.days }, (_, i) => {
                const day = i + 1;
                const key = keyOf(grid.year, grid.month0, day);
                const { row, col } = cellOf(grid, day);
                const on = itemsOnDay(items, key);
                const more = overflow.get(day) ?? 0;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={t.dayLabel(dayTitle(key), on.map((x) => x.title), key === today)}
                    accessibilityState={{ selected: selected === key }}
                    onPress={() => setSelected(key)}
                    style={[styles.cell, { left: col * cellW, top: row * CELL_H, width: cellW, height: CELL_H }]}
                  >
                    <Text style={[styles.dayNum, { color: palette.ink }, key === today && styles.today]}>{day}</Text>
                    {more > 0 ? <Text style={[styles.more, { color: palette.ink }]}>{t.more(more)}</Text> : null}
                  </Pressable>
                );
              })}
              {shown.map((s) => {
                  const item = byId.get(s.itemId)!;
                  return (
                    <View
                      key={`${s.itemId}:${s.row}`}
                      pointerEvents="box-none"
                      style={{
                        position: 'absolute',
                        left: s.colStart * cellW + 2,
                        top: s.row * CELL_H + DAY_H + s.lane * LANE_PITCH,
                      }}
                    >
                      <HighlighterStroke
                        width={(s.colEnd - s.colStart + 1) * cellW - 4}
                        height={STROKE_H}
                        color={highlighterFor(palette, s.itemId)}
                        startCap={s.capStart ? 'round' : 'flat'}
                        endCap={s.capEnd ? 'round' : 'flat'}
                        seed={`${s.itemId}:${s.row}`}
                        emoji={s.emoji ? item.emoji : undefined}
                        lanePitch={LANE_PITCH}
                        onPress={() => openItem(item)}
                        accessibilityLabel={itemLabel(item)}
                        a11yPrimary={a11yFirst.has(`${s.itemId}:${s.row}`)}
                      />
                    </View>
                  );
                })}
            </>
          ) : null}
        </View>

        {selected ? (
          <QCard>
            <Text style={styles.dayHead} accessibilityRole="header">
              {dayTitle(selected)}
            </Text>
            {dayItems.length === 0 ? <Hint>{t.nothing}</Hint> : null}
            {dayItems.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={itemLabel(item)}
                onPress={() => openItem(item)}
                style={styles.dayRow}
              >
                <Text style={styles.dayEmoji}>{item.emoji}</Text>
                <View style={styles.flex}>
                  <Text style={styles.dayTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.daySub}>
                    {`${item.kind === 'room' ? t.roomTag : t.eventTag} · ${rangeLabel(item.start, item.end, thisYear)}`}
                  </Text>
                </View>
                {item.kind === 'event' || isPast(item) ? (
                  <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} />
                ) : null}
              </Pressable>
            ))}
          </QCard>
        ) : null}
      </QScreen>

      <Modal visible={!!diary} transparent animationType="fade" onRequestClose={() => setDiary(null)}>
        {/* The close scrim is a sibling behind the card: a Pressable wrapping the card would make VoiceOver read
            only "Close diary" and never the diary itself. */}
        <View style={styles.scrim} accessibilityViewIsModal onAccessibilityEscape={() => setDiary(null)}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t.diaryClose}
            onPress={() => setDiary(null)}
          />
          {diary ? (
            <DiaryCard
              width={Math.min(360, width + 24 || 340)}
              title={`${diary.emoji} ${diary.name}`}
              dateLine={rangeLabel(diary.start, diary.end, thisYear)}
              lines={diaryText(diary.diary, t.diaryNone)}
              accessibilityLabel={[diary.name, rangeLabel(diary.start, diary.end, thisYear), ...diaryText(diary.diary, t.diaryNone)].join('. ')}
            />
          ) : null}
        </View>
      </Modal>

      <AskSheet visible={asking} onClose={() => setAsking(false)} today={today} />
    </>
  );
}

/** Bottom-right Qrewing: one sentence → calendar_add → the event editor prefilled to confirm and save. */
function AskSheet({ visible, onClose, today }: { visible: boolean; onClose: () => void; today: DateKey }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  useAnnounce(error, tries);
  useAnnounce(busy ? t.askBusy : null, busy);

  function close() {
    setError(null);
    onClose();
  }

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await calendarAdd(text, today, tz);
    setBusy(false);
    const ev = 'data' in res ? parseCalendarAdd(res.data) : null;
    if (!ev) {
      const code = 'error' in res ? res.error : 'other';
      setError(code === 'unclear' ? t.askErrors.unclear : code === 'rate_limited' ? t.askErrors.rate_limited : t.askErrors.other);
      setTries((n) => n + 1);
      return;
    }
    setText('');
    onClose();
    router.push({ pathname: '/calendar-event', params: { ...ev, ask: '1' } });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={close}>
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {t.askTitle}
          </Text>
          <Pressable accessibilityRole="button" onPress={close} style={styles.headerIcon}>
            <Text style={styles.cancel}>{t.cancel}</Text>
          </Pressable>
        </View>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError(null);
          }}
          placeholder={t.askPlaceholder}
          placeholderTextColor={colors.secondaryLabel}
          accessibilityLabel={t.askTitle}
          maxLength={300}
          multiline
          autoFocus
          style={styles.askField}
        />
        {busy ? <Hint>{t.askBusy}</Hint> : null}
        {error ? <Hint tone="error">{error}</Hint> : null}
        <Button title={t.askSend} onPress={send} busy={busy} disabled={!text.trim()} />
      </View>
    </Modal>
  );
}

const FAB = 56;

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  flex: { flex: 1 },
  upsellTitle: { fontSize: 17, fontWeight: '600', color: colors.label },
  headerIcon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  month: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '600', color: colors.label },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 13, color: colors.secondaryLabel },
  grid: { position: 'relative', borderRadius: 8 },
  cell: { position: 'absolute', paddingTop: 2, paddingHorizontal: 4 },
  dayNum: { fontSize: 13, fontVariant: ['tabular-nums'] },
  today: { fontWeight: '800', textDecorationLine: 'underline' },
  more: { position: 'absolute', right: 4, top: 3, fontSize: 11, fontWeight: '600' },
  dayHead: { fontSize: 15, fontWeight: '600', color: colors.label },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  dayEmoji: { fontSize: 22 },
  dayTitle: { fontSize: 16, color: colors.label },
  daySub: { fontSize: 13, color: colors.secondaryLabel },
  fab: { position: 'absolute', width: FAB, height: FAB, borderRadius: FAB / 2 },
  fabArt: { width: '100%', height: '100%', borderRadius: FAB / 2 },
  fabRing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: FAB / 2, borderWidth: 1.5, borderColor: colors.label },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 16 },
  sheet: { flex: 1, padding: 24, gap: 12, backgroundColor: colors.background },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sheetTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: colors.label },
  cancel: { fontSize: 17, color: colors.tint },
  askField: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.separator,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: colors.label,
    textAlignVertical: 'top',
  },
});
