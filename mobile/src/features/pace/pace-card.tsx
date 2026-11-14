import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button, colors, Hint, radius } from '@/components/ui';
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
import { paceApplies } from './pace-layer';
import { saveTarget, setOn, usePaceSettings } from './settings';
import { initialPaceSec, targetFieldsFilled } from './target-form';
import { en } from '@/i18n/en';
const t = en.pace;

/** Map screen card (spec 3.4): the Pace maker switch (per room, default off), the target, and my live stats. */
export function PaceCard({ room, share }: { room: Room; share: boolean }) {
  const settings = usePaceSettings(room.id);
  const run = usePaceRun(runKey(room.id, room.activity_seq));
  if (!paceApplies(room)) return null;
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
        <Switch
          value={settings.on}
          onValueChange={(on) => setOn(room.id, on)}
          accessibilityLabel={t.title}
          trackColor={{ true: colors.tint }}
        />
      </View>
      <Hint>{t.switchHint}</Hint>
      {settings.on ? (
        <>
          {!share ? <Hint tone="error">{t.needsSharing}</Hint> : !active ? <Hint>{t.needsActivity}</Hint> : null}
          {stats ? <StatsRow {...stats} /> : null}
          <TargetEditor target={settings.target} usual={usual} goal={goal} />
          {goal == null ? <Hint>{t.noTarget}</Hint> : null}
        </>
      ) : null}
    </View>
  );
}

/** Spec 11 A19: full-width stats, Strava/NRC style: big numbers, small labels. VoiceOver reads one line. */
function StatsRow({ km, moving, pace, spoken }: { km: string; moving: string; pace: string | null; spoken: string }) {
  const cells = [
    { value: km, label: t.statKm },
    { value: moving, label: t.statMoving },
    { value: pace ?? '–', label: t.statPace },
  ];
  return (
    <View style={styles.statsRow} accessible accessibilityLabel={spoken}>
      {cells.map((c, i) => (
        <View key={c.label} style={[styles.statCell, i > 0 && styles.statDivider]}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {c.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {c.label}
          </Text>
        </View>
      ))}
    </View>
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
    // Spec 11 A19: one outlined box: the saved target on the head line, a one-line segmented control, then the
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
  statsRow: { flexDirection: 'row', paddingVertical: 8 },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: colors.separator },
  statValue: { fontSize: 40, fontWeight: '700', color: colors.label, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, color: colors.secondaryLabel, marginTop: 2 },
  target: {
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.separator,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 14,
  },
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
  unit: { fontSize: 15, color: colors.secondaryLabel },
});
