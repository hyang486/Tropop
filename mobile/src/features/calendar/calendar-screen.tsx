/**
 * Moments home (calendar-v2-spec §A, human FINAL 2026-11-15 02:00): greeting, the Trok summary of this week, a
 * two-week day strip that expands to the month, and Past / Upcoming rows. A day tap opens the day detail
 * (/calendar-day); rooms, recaps and the Plus upsell live there. Phone-only data. Add opens Add event / Add with
 * Trok (Plus only; Free goes to the Plus intro).
 */
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActionSheetIOS } from '@/lib/dialogs';
import { Modal } from '@/components/modal';
import { Text, TextInput } from '@/components/text';

import { DayItemsSheet } from '@/components/calendar';
import { useReduceMotion } from '@/components/enter-view';
import { HandTitle } from '@/components/hand-title';
import { ProfileAvatarButton } from '@/components/tab-header';
import { Button, colors, GlassIconButton, Hint, titleSize } from '@/components/ui';
import { useAnnounce } from '@/features/event/announce';
import { calendarAdd } from '@/features/event/qrewing-api';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';
import { useNow } from '@/lib/use-now';

import { calendarGate, createRequestGate, parseCalendarAdd } from './calendar-data';
import { monthTitle, rangeLabel, weekdayLabels } from './calendar-format';
import { type DateKey, localDateKey, shiftMonth } from './calendar-plan';
import { reloadCalendar, useCalendar, useCalendarFailed, usePlanState } from './calendar-store';
import {
  dayMarks, dimmed, type HomeItem, homeItems, joinParts, pastRow, rowLine, stripRows, summaryParts, upcomingRow, weekSummary,
} from './home-model';
import { PlanOfflineLine } from './plan-offline-line';
import { addTapAction, plusIntroHref } from './plus-intro';

const t = en.calendar;
const EVENT_DOT = '#E0A800';

export function CalendarScreen() {
  const uid = useAuth().session?.user.id;
  // Signed out: the root auth redirect takes over; nothing to show here.
  if (calendarGate(!!uid) === 'signedOut') return <ActivityIndicator style={styles.loading} />;
  return <MomentsHome uid={uid!} />;
}

function firstName(name: string | null | undefined): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first ? first : null;
}

const longDay = (key: DateKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

function MomentsHome({ uid }: { uid: string }) {
  // C14: null until the plan is confirmed (Add with Trok waits); the Plus intro shows only on Free.
  const plan = usePlanState(uid);
  const plus = plan === 'plus' ? true : plan === 'free' ? false : null;
  const router = useRouter();
  const profile = useAuth().profile;
  const reduceMotion = useReduceMotion();
  const doc = useCalendar(uid);
  const docFailed = useCalendarFailed(uid);
  const [docRetrying, setDocRetrying] = useState(false);
  const now = useNow(60_000);
  const today = localDateKey(now);
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState(() => ({ year: +today.slice(0, 4), month0: +today.slice(5, 7) - 1 }));
  const [selected, setSelected] = useState<DateKey>(today);
  const [sheet, setSheet] = useState<'past' | 'upcoming' | null>(null);
  const [asking, setAsking] = useState(false);

  // §A4: collapsed, on this month, with today selected every time the tab opens.
  useFocusEffect(
    useCallback(() => {
      const key = localDateKey(Date.now());
      setExpanded(false);
      setMonth({ year: +key.slice(0, 4), month0: +key.slice(5, 7) - 1 });
      setSelected(key);
    }, []),
  );

  const items = useMemo(() => (doc ? homeItems(doc, now) : []), [doc, now]);
  const summary = useMemo(() => weekSummary(items, today, now), [items, today, now]);
  const rows = useMemo(() => stripRows(today, expanded, month.year, month.month0), [today, expanded, month]);
  const marks = useMemo(() => dayMarks(items, rows.flat()), [items, rows]);
  const past = useMemo(() => pastRow(items, today), [items, today]);
  const upcoming = useMemo(() => upcomingRow(items, now), [items, now]);
  const weekdays = useMemo(() => weekdayLabels(0), []);
  const thisYear = +today.slice(0, 4);

  function openDay(key: DateKey) {
    setSelected(key);
    router.push({ pathname: '/calendar-day', params: { date: key } });
  }

  function openAdd() {
    const ask = addTapAction(plus);
    const run = (i: number) => {
      if (i === 0) router.push('/calendar-event');
      else if (i === 1 && ask === 'ask') setAsking(true);
      else if (i === 1 && ask) router.push(plusIntroHref('calendar'));
    };
    // Plan unread: only Add event (Add with Trok waits for the plan, C14).
    const options = ask === null ? [t.add, t.addMenuCancel] : [t.add, t.ask, t.addMenuCancel];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1, tintColor: colors.tint }, run);
    } else {
      router.push('/calendar-event');
    }
  }

  const parts = summaryParts(summary);
  const sentence = joinParts(parts, (p) =>
    p.kind === 'rooms' ? t.summaryRooms(p.n) : p.kind === 'people' ? t.summaryPeople(p.n) : t.summaryComing(p.n),
  );
  const spokenSummary = `${t.summaryLabel}. ${parts.length ? sentence.flat().join('') : t.summaryEmpty}`;
  const sheetRow = sheet === 'past' ? past : sheet === 'upcoming' ? upcoming : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          // §A1 (ux 2026-11-15): the tab nav bar holds the wordmark (layout) and, on the right, Add then the avatar.
          headerRight: () => (
            <View style={styles.headerRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={t.addButton} onPress={openAdd} style={styles.addBtn}>
                <SymbolView name="plus" size={20} tintColor={colors.tint} />
              </Pressable>
              <ProfileAvatarButton />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.greeting}>
          <Text style={styles.hi}>{t.greeting(firstName(profile?.display_name))}</Text>
          <Text style={styles.weekTitle} accessibilityRole="header">
            {t.weekTitle}
          </Text>
        </View>

        <View style={styles.summary} accessible accessibilityLabel={spokenSummary}>
          <View style={styles.summaryTop}>
            <SymbolView name="sparkles" size={18} tintColor={colors.tint} />
            <Text style={styles.summaryLabel}>{t.summaryLabel}</Text>
          </View>
          {parts.length ? (
            <Text style={styles.summaryBody}>
              {sentence.map(([sep, em, rest], i) => (
                <Text key={i}>
                  {sep}
                  <Text style={styles.summaryEm}>{em}</Text>
                  {rest}
                </Text>
              ))}
            </Text>
          ) : (
            <Text style={[styles.summaryBody, { color: colors.ink2 }]}>{t.summaryEmpty}</Text>
          )}
        </View>

        {plan === 'offline' ? <PlanOfflineLine uid={uid} /> : null}

        <View style={styles.monthHead}>
          <Text style={styles.month} accessibilityRole="header">
            {monthTitle(month.year, month.month0)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? t.collapseMonth : t.expandMonth}
            accessibilityState={{ expanded }}
            onPress={() => {
              if (expanded) setMonth({ year: +today.slice(0, 4), month0: +today.slice(5, 7) - 1 });
              setExpanded(!expanded);
            }}
            style={styles.iconBtn}
          >
            <SymbolView
              name={reduceMotion && expanded ? 'chevron.up' : 'chevron.down'}
              size={18}
              tintColor={colors.label}
              style={!reduceMotion && expanded ? styles.flipped : undefined}
            />
          </Pressable>
          <View style={styles.flex} />
          {expanded ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={t.prevMonth} onPress={() => setMonth((m) => shiftMonth(m.year, m.month0, -1))} style={styles.iconBtn}>
                <SymbolView name="chevron.left" size={18} tintColor={colors.label} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t.nextMonth} onPress={() => setMonth((m) => shiftMonth(m.year, m.month0, 1))} style={styles.iconBtn}>
                <SymbolView name="chevron.right" size={18} tintColor={colors.label} />
              </Pressable>
            </>
          ) : null}
        </View>

        <View>
          <View style={styles.weekRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {weekdays.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>
          {rows.map((row) => (
            <View key={row[0]} style={styles.weekRow}>
              {row.map((key) => {
                const mark = marks.get(key) ?? { rooms: 0, events: 0 };
                const isSel = key === selected;
                const isToday = key === today;
                const room = mark.rooms > 0;
                const dot = room ? (isSel ? colors.onTint : colors.tint) : mark.events > 0 ? (isSel ? colors.onTint : EVENT_DOT) : null;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={t.dayCellLabel(longDay(key), isToday, mark.rooms, mark.events)}
                    accessibilityState={{ selected: isSel }}
                    onPress={() => openDay(key)}
                    style={[styles.cell, dimmed(key, today, expanded, month.year, month.month0) && styles.dim]}
                  >
                    <View
                      style={[
                        styles.circle,
                        room && { backgroundColor: colors.redwash },
                        isSel && { backgroundColor: colors.tint },
                        isToday && !isSel && styles.todayRing,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          room && styles.dayNumRoom,
                          isSel && styles.dayNumSel,
                        ]}
                      >
                        {+key.slice(8)}
                      </Text>
                      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <SummaryRow icon="checkmark.circle" title={t.past} line={rowLine(past, true)} onPress={() => setSheet('past')} />
        <SummaryRow icon="calendar" title={t.upcoming} line={rowLine(upcoming, false)} onPress={() => setSheet('upcoming')} />

        {/* UX2-124: loading and a failed read of the calendar on this phone (same copy as before). */}
        {!doc && !docFailed ? <ActivityIndicator style={styles.docLoading} accessibilityLabel={t.loading} /> : null}
        {!doc && docFailed ? (
          <>
            <Hint tone="error">{t.loadFailed}</Hint>
            <Button
              title={t.tryAgain}
              variant="secondary"
              busy={docRetrying}
              onPress={() => {
                setDocRetrying(true);
                void reloadCalendar(uid).finally(() => setDocRetrying(false));
              }}
            />
          </>
        ) : null}
      </ScrollView>

      <DayItemsSheet
        visible={!!sheetRow}
        dateLabel={sheet === 'past' ? t.past : t.upcoming}
        items={(sheetRow?.items ?? []).map((i: HomeItem) => ({
          key: i.id,
          title: i.title,
          icon: i.emoji,
          kind: i.kind,
          a11yLabel: `${i.title}, ${rangeLabel(i.start, i.end, thisYear)}`,
        }))}
        onPick={(key) => {
          const item = sheetRow?.items.find((i) => i.id === key);
          setSheet(null);
          if (item) openDay(item.start);
        }}
        onClose={() => setSheet(null)}
      />

      <AskSheet visible={asking} onClose={() => setAsking(false)} today={today} />
    </>
  );
}

function SummaryRow({ icon, title, line, onPress }: { icon: 'checkmark.circle' | 'calendar'; title: string; line: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${line}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SymbolView name={icon} size={24} tintColor={colors.tint} />
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowLine}>{line}</Text>
      </View>
      <SymbolView name="chevron.right" size={14} tintColor={colors.ink2} />
    </Pressable>
  );
}

/** Bottom-right Trok: one sentence → calendar_add → the event editor prefilled to confirm and save. */
function AskSheet({ visible, onClose, today }: { visible: boolean; onClose: () => void; today: DateKey }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  // Sweep 2: closing the sheet drops an answer still on its way (no editor opening after Cancel).
  const [gate] = useState(createRequestGate);
  useAnnounce(error, tries);
  useAnnounce(busy ? t.askBusy : null, busy);
  // UX2-46: closes at once when a link or notification tap navigates.
  const instant = useDismissOnLink(visible ? close : null);

  function close() {
    gate.cancel();
    setBusy(false);
    setError(null);
    onClose();
  }

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const id = gate.start();
    const res = await calendarAdd(text, today, tz);
    if (!gate.isCurrent(id)) return;
    gate.cancel();
    setBusy(false);
    const ev = 'data' in res ? parseCalendarAdd(res.data) : null;
    if (!ev) {
      const code = 'error' in res ? res.error : 'other';
      // 402 plan_limit: the server plan is not Plus (0032), so this goes to the Calendar Plus gate, as the diary does.
      if (code === 'plan_limit') {
        close();
        router.push(plusIntroHref('calendar'));
        return;
      }
      setError(
        code === 'unclear'
          ? t.askErrors.unclear
          : code === 'rate_limited'
            ? t.askErrors.rate_limited
            : code === 'network'
              ? t.askErrors.network
              : t.askErrors.other,
      );
      setTries((n) => n + 1);
      return;
    }
    setText('');
    onClose();
    router.push({ pathname: '/calendar-event', params: { ...ev, ask: '1' } });
  }

  return (
    <Modal visible={visible} animationType={instant ? 'none' : 'slide'} presentationStyle="formSheet" onRequestClose={close}>
      <View style={styles.sheet}>
        <View style={styles.sheetHead}>
          <HandTitle style={styles.sheetTitle}>{t.askTitle}</HandTitle>
          <GlassIconButton symbol="xmark" label={t.cancel} onPress={close} />
        </View>
        <TextInput
          selectionColor={colors.label}
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

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16, backgroundColor: colors.background },
  flex: { flex: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.wash, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { gap: 2 },
  hi: { fontSize: 16, lineHeight: 24, color: colors.ink2 },
  weekTitle: { fontSize: 28, lineHeight: 36, fontFamily: 'SourceSans3-Bold', color: colors.label },
  summary: { backgroundColor: colors.softGold, borderRadius: 24, padding: 16, minHeight: 96, gap: 8 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 14, lineHeight: 20, fontFamily: 'SourceSans3-Semibold', color: colors.tint },
  summaryBody: { fontSize: 17, lineHeight: 24, color: colors.label },
  summaryEm: { fontFamily: 'SourceSans3-Semibold', color: colors.tint },
  monthHead: { flexDirection: 'row', alignItems: 'center' },
  month: { fontSize: 20, lineHeight: 28, fontFamily: 'SourceSans3-Semibold', color: colors.label },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flipped: { transform: [{ rotate: '180deg' }] },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, lineHeight: 18, color: colors.ink2 },
  cell: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.5 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  todayRing: { borderWidth: 1.5, borderColor: colors.tint },
  dayNum: { fontSize: 17, lineHeight: 22, color: colors.label },
  dayNumRoom: { fontFamily: 'SourceSans3-Semibold', color: colors.tint },
  dayNumSel: { fontFamily: 'SourceSans3-Bold', color: colors.onTint },
  dot: { position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 2.5 },
  row: { minHeight: 64, borderRadius: 24, backgroundColor: colors.wash, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.7 },
  rowTitle: { fontSize: 17, lineHeight: 22, fontFamily: 'SourceSans3-Semibold', color: colors.label },
  rowLine: { fontSize: 15, lineHeight: 20, color: colors.ink2 },
  docLoading: { alignSelf: 'center', paddingVertical: 16 },
  sheet: { flex: 1, padding: 24, gap: 12, backgroundColor: colors.sheet },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sheetTitle: { flex: 1, fontSize: titleSize.sheet, lineHeight: 28 },
  askField: {
    minHeight: 96,
    backgroundColor: colors.wash,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: colors.label,
    textAlignVertical: 'top',
  },
});
