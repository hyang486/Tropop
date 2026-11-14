import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { QLink, qSpacing } from '@/components/q-screen';
import { Button, colors, Hint, radius, size, space, textRole } from '@/components/ui';
import { usePlusPreview } from '@/features/calendar/calendar-store';
import { plusIntroHref } from '@/features/calendar/plus-intro';
import { InkSwitch } from '@/features/event/ink-switch';
import type { Room } from '@/lib/rooms';

import { runKey, usePaceRun } from './engine';
import {
  formatDuration,
  formatPace,
  type PaceTarget,
  parseDuration,
  parseKm,
  parsePace,
  targetSecPerKm,
  usualPace,
} from './pace-core';
import { paceAllowed, paceApplies } from './pace-layer';
import { saveTarget, setOn, usePaceSettings } from './settings';
import { initialPaceSec, TARGET_TICK, targetBarFill, targetFieldsFilled } from './target-form';
import { en } from '@/i18n/en';
const t = en.pace;

/** Map screen card (spec 3.4): the Pace maker switch (per room, default off), the target, and my live stats. */
export function PaceCard({ room, share, userId }: { room: Room; share: boolean; userId: string | undefined }) {
  const settings = usePaceSettings(room.id);
  const run = usePaceRun(runKey(room.id, room.activity_seq));
  const plus = usePlusPreview(userId);
  const router = useRouter();
  if (!paceApplies(room)) return null;
  // capacity B item 4: the caller's own plan, not the host's. Free sees why and a way to Plus; null = still loading.
  if (plus === false) {
    return (
      <View style={styles.group}>
        <Text style={styles.switchLabel}>{t.title}</Text>
        <Hint>{t.plusOnly}</Hint>
        <QLink title={en.planPreview.seePlus} onPress={() => router.push(plusIntroHref('pace'))} />
      </View>
    );
  }
  const active = room.activity_state === 'active';
  const usual = usualPace(settings.history);
  const goal = targetSecPerKm(settings.target, usual);
  const stats = run?.tracker.lastFix
    ? {
        km: (run.tracker.distanceM / 1000).toFixed(2),
        moving: formatDuration(run.tracker.movingMs / 1000),
        pace: formatPace(run.recent),
        spoken: t.stats(run.tracker.distanceM, formatDuration(run.tracker.movingMs / 1000), formatPace(run.recent)),
      }
    : null;

  return (
    <View style={styles.group}>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t.title}</Text>
        {/* Spec 11 polish: off and disabled until Share my location is on; the saved choice returns with sharing. */}
        <InkSwitch
          value={settings.on && share && paceAllowed(plus)}
          disabled={!share || !paceAllowed(plus)}
          onValueChange={(on) => setOn(room.id, on)}
          accessibilityLabel={t.title}
        />
      </View>
      <Hint>{share ? t.switchHint : t.needsSharing}</Hint>
      {settings.on && share && paceAllowed(plus) ? (
        <>
          {!active ? <Hint>{t.needsActivity}</Hint> : null}
          {stats ? <StatsRow {...stats} /> : null}
          <TargetRow target={settings.target} usual={usual} goal={goal} current={run?.recent ?? null} />
          {goal == null ? <Hint>{t.noTarget}</Hint> : null}
        </>
      ) : null}
    </View>
  );
}

/** Spec 11 A19, UX P1-9: 34 pt tabular numbers, 13 pt labels under them, left aligned. VoiceOver reads one line. */
function StatsRow({ km, moving, pace, spoken }: { km: string; moving: string; pace: string | null; spoken: string }) {
  const cells = [
    { value: km, label: t.statKm },
    { value: moving, label: t.statMoving },
    { value: pace ?? '–', label: t.statPace },
  ];
  return (
    <View style={styles.statsRow} accessible accessibilityLabel={spoken}>
      {cells.map((c) => (
        <View key={c.label} style={styles.statCell}>
          <Text style={textRole.stat} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {c.value}
          </Text>
          <Text style={textRole.caption} numberOfLines={1}>
            {c.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * UX P1-9: one 56 pt row: "Target 5:00/km", my recent pace as a bar against the target tick, and Edit, which
 * opens the Usual / Pace / Time form in a sheet.
 */
function TargetRow({
  target,
  usual,
  goal,
  current,
}: {
  target: PaceTarget;
  usual: number | null;
  goal: number | null;
  current: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const insets = useSafeAreaInsets();
  const fill = targetBarFill(current, goal);
  return (
    <>
      <View style={styles.targetRow}>
        <View
          style={styles.targetMain}
          accessible
          accessibilityLabel={t.targetBarA11y(formatPace(current), formatPace(goal))}
        >
          <Text style={textRole.body} numberOfLines={1}>
            {`${t.targetRow} `}
            <Text style={styles.targetValue}>{t.targetRowValue(formatPace(goal))}</Text>
          </Text>
          <View style={styles.bar}>
            {fill != null ? <View style={[styles.barFill, { width: `${fill * 100}%` }]} /> : null}
            {goal != null ? <View style={styles.tick} /> : null}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.editTargetA11y}
          onPress={() => setEditing(true)}
          hitSlop={8}
          style={styles.edit}
        >
          <Text style={styles.editText}>{t.editTarget}</Text>
        </Pressable>
      </View>
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        {/* The pace and time fields sit in the sheet, so it rises with the keyboard. */}
        <KeyboardAvoidingView behavior="padding" style={styles.sheetRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setEditing(false)}
            accessibilityRole="button"
            accessibilityLabel={t.done}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.m) + space.xs }]} accessibilityViewIsModal>
            <View style={styles.grabber} />
            <HandTitle style={styles.sheetTitle}>{t.targetSheetTitle}</HandTitle>
            <TargetEditor target={target} usual={usual} goal={goal} />
            <QLink title={t.done} onPress={() => setEditing(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

type Mode = PaceTarget['kind'];

function TargetEditor({ target, usual, goal }: { target: PaceTarget; usual: number | null; goal: number | null }) {
  const [mode, setMode] = useState<Mode>(target.kind);
  // E2E (j): prefilled with my target or usual pace; with neither, empty under an "e.g." hint.
  const [pace, setPace] = useState(formatPace(initialPaceSec(target, usual)) ?? '');
  const paceTouched = useRef(false);
  // The usual pace can arrive after mount (history loads); fill it in unless I already typed.
  useEffect(() => {
    if (!paceTouched.current && usual != null && target.kind !== 'pace') setPace((p) => p || (formatPace(usual) ?? ''));
  }, [usual, target.kind]);
  const [km, setKm] = useState(target.kind === 'time' ? String(target.distanceM / 1000) : '');
  const [time, setTime] = useState(target.kind === 'time' ? formatDuration(target.timeS) : '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function choose(next: Mode) {
    setMode(next);
    setError(null);
    setSaved(false);
    if (next === 'usual') saveTarget({ kind: 'usual' });
  }

  function save() {
    setSaved(false);
    if (mode === 'pace') {
      const secPerKm = parsePace(pace);
      if (secPerKm == null) return setError(t.invalidPace);
      saveTarget({ kind: 'pace', secPerKm });
    } else if (mode === 'time') {
      const distanceM = parseKm(km);
      const timeS = parseDuration(time);
      if (distanceM == null || timeS == null) return setError(t.invalidTime);
      saveTarget({ kind: 'time', distanceM, timeS });
    }
    setError(null);
    setSaved(true);
  }

  // Short segment labels on one line; VoiceOver keeps the full names.
  const options: { mode: Mode; label: string; a11y: string }[] = [
    { mode: 'usual', label: t.segUsual, a11y: t.targetUsual(formatPace(usual)) },
    { mode: 'pace', label: t.segPace, a11y: t.targetPace },
    { mode: 'time', label: t.segTime, a11y: t.targetTime },
  ];
  const shown =
    mode === 'pace' || mode === 'time'
      ? targetSecPerKm(
          mode === 'pace'
            ? { kind: 'pace', secPerKm: parsePace(pace) ?? 0 }
            : {
                kind: 'time',
                distanceM: parseKm(km) ?? 0,
                timeS: parseDuration(time) ?? 0,
              },
          usual,
        )
      : null;

  return (
    // UX P1-9: inside the Edit sheet: the saved target on the head line, a one-line segmented control, then the
    // fields for the chosen kind.
    <View style={styles.target}>
      <View style={styles.targetHead}>
        <Text style={styles.label} accessibilityRole="header">
          {t.target}
        </Text>
        <Text style={styles.targetNow}>{t.targetNow(formatPace(goal))}</Text>
      </View>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {options.map((o, i) => (
          <Pressable
            key={o.mode}
            accessibilityRole="radio"
            accessibilityLabel={o.a11y}
            accessibilityState={{ selected: mode === o.mode }}
            onPress={() => choose(o.mode)}
            style={[styles.segment, i > 0 && styles.segmentDivider, mode === o.mode && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, mode === o.mode && styles.segmentTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {mode === 'pace' ? (
        <View style={styles.inputRow}>
          <TextInput
            value={pace}
            onChangeText={(v) => {
              paceTouched.current = true;
              setPace(v);
            }}
            placeholder={t.pacePlaceholder}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={t.targetPace}
            placeholderTextColor={colors.secondaryLabel}
            style={styles.input}
          />
          <Text style={styles.unit}>{t.perKm}</Text>
        </View>
      ) : null}
      {mode === 'time' ? (
        <View style={styles.inputRow}>
          <TextInput
            value={km}
            onChangeText={setKm}
            placeholder={t.distancePlaceholder}
            keyboardType="decimal-pad"
            accessibilityLabel={t.distanceLabel}
            placeholderTextColor={colors.secondaryLabel}
            style={styles.input}
          />
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder={t.timePlaceholder}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={t.timeLabel}
            placeholderTextColor={colors.secondaryLabel}
            style={styles.input}
          />
          {shown ? <Text style={styles.unit}>{`${formatPace(shown)} ${t.perKm}`}</Text> : null}
        </View>
      ) : null}
      {mode !== 'usual' ? (
        <Button title={t.save} variant="secondary" onPress={save} disabled={!targetFieldsFilled(mode, pace, km, time)} />
      ) : null}
      {mode !== 'usual' && !targetFieldsFilled(mode, pace, km, time) ? (
        <Hint>{mode === 'pace' ? t.paceEmpty : t.timeEmpty}</Hint>
      ) : null}
      {error ? <Hint tone="error">{error}</Hint> : null}
      {saved && !error ? <Hint>{t.saved}</Hint> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.separator,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  switchLabel: { fontSize: 17, color: colors.label, flexShrink: 1 },
  statsRow: { flexDirection: 'row', paddingVertical: space.s, gap: space.l },
  statCell: { flex: 1, alignItems: 'flex-start' },
  targetRow: {
    minHeight: size.rowSubtitle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.separator,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: space.l,
  },
  targetMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m },
  targetValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  bar: { flex: 1, minWidth: 48, height: 6, borderRadius: 3, backgroundColor: colors.separator, justifyContent: 'center' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.label },
  tick: { position: 'absolute', left: `${TARGET_TICK * 100}%`, width: 2, height: 18, marginLeft: -1, backgroundColor: colors.label },
  edit: { minHeight: size.hit, justifyContent: 'center' },
  editText: { fontSize: 17, color: colors.label, textDecorationLine: 'underline' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: qSpacing.side,
    paddingTop: space.s,
    gap: space.m,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.grabber, marginBottom: space.xs },
  sheetTitle: { marginBottom: space.xs },
  target: { gap: 10 },
  targetHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 17, fontWeight: '600', color: colors.label },
  targetNow: { fontSize: 17, color: colors.label, fontVariant: ['tabular-nums'] },
  segments: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.tint,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentDivider: { borderLeftWidth: 1.5, borderLeftColor: colors.tint },
  segmentOn: { backgroundColor: colors.tint },
  segmentText: { fontSize: 15, color: colors.label },
  segmentTextOn: { color: colors.onTint, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    minWidth: 88,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.separator,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.label,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 15, color: colors.ink2 },
});
