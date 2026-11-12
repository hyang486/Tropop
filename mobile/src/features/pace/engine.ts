import { useSyncExternalStore } from 'react';

import {
  closeStationary,
  gapCue,
  newPaceCueState,
  newStationaryState,
  newTracker,
  openStationary,
  OFF_TARGET_EVERY_MS,
  type PaceCueState,
  type PaceFix,
  type Point,
  paceCue,
  progressOf,
  recentSecPerKm,
  type Runner,
  type StationaryState,
  stationaryDue,
  stepFix,
  summarize,
  type Tracker,
} from './pace-core';
import { saveSession } from './storage';
import { paceStrings as t } from './strings';
import { speak } from './voice';

/**
 * One pace session per room and activity (activity_seq), kept for the app run so leaving and reopening the Map
 * keeps the same session. Screens read it with usePaceSession; PaceLayer feeds it.
 */
export type PaceRun = {
  key: string;
  tracker: Tracker;
  /** My fixes of the last few minutes (stationary check, recent pace). */
  fixes: PaceFix[];
  cueState: PaceCueState;
  lastGapCueAtMs: number | null;
  lastCueAtMs: number | null;
  stationary: StationaryState;
  lastSavedAtMs: number;
  /** My pace over the last minute, s/km. */
  recent: number | null;
};

const FIX_KEEP_MS = 6 * 60_000;
const SAVE_EVERY_MS = 30_000;
/** Two cues never come closer than this, so they do not talk over each other. */
const MIN_CUE_GAP_MS = 20_000;

const runs = new Map<string, PaceRun>();
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const runKey = (roomId: string, activitySeq: number) => `${roomId}:${activitySeq}`;

export function usePaceRun(key: string | null): PaceRun | null {
  return useSyncExternalStore(subscribe, () => (key ? (runs.get(key) ?? null) : null));
}

function getRun(key: string, roomId: string, nowMs: number): PaceRun {
  let run = runs.get(key);
  if (!run) {
    run = {
      key,
      tracker: newTracker(roomId, nowMs),
      fixes: [],
      cueState: newPaceCueState(),
      lastGapCueAtMs: null,
      lastCueAtMs: null,
      stationary: newStationaryState(),
      lastSavedAtMs: 0,
      recent: null,
    };
    runs.set(key, run);
  }
  return run;
}

function put(run: PaceRun) {
  runs.set(run.key, run);
  emit();
}

/** Saves the session to history now (End activity, switch off, leaving the screen). */
export function flushRun(key: string) {
  const run = runs.get(key);
  if (!run || !run.tracker.lastFix) return;
  put({ ...run, lastSavedAtMs: Date.now() });
  saveSession(summarize(run.tracker)).catch(() => {});
}

export type FeedContext = {
  roomId: string;
  userId: string;
  nowMs: number;
  targetSecPerKm: number | null;
  route: Point[];
  /** The room's place pin, if set. */
  place: Point | null;
  /** Other members' fresh positions and speeds (stale rows already removed); mine included. */
  others: { userId: string; point: Point; speedMps: number | null }[];
};

/** One new fix of mine: stats, then at most one cue (km first, then the lead-group gap, then off-target). */
export function feedFix(key: string, fix: PaceFix, ctx: FeedContext) {
  let run = getRun(key, ctx.roomId, ctx.nowMs);
  const stepped = stepFix(run.tracker, fix);
  // A repeat, an older fix or a GPS jump: nothing to update (the tracker keeps its count of dropped jumps).
  if (!stepped.kept) {
    if (stepped.tracker !== run.tracker) put({ ...run, tracker: stepped.tracker });
    return;
  }
  const tracker = stepped.tracker;
  const fixes = [...run.fixes.filter((f) => f.atMs >= ctx.nowMs - FIX_KEEP_MS), fix];
  const recent = recentSecPerKm(fixes, fix.atMs);
  run = { ...run, tracker, fixes, recent };

  const quiet = run.lastCueAtMs != null && ctx.nowMs - run.lastCueAtMs < MIN_CUE_GAP_MS;
  let text: string | null = null;

  const km = Math.floor(tracker.distanceM / 1000);
  const paced = paceCue(run.cueState, {
    nowMs: ctx.nowMs,
    km,
    lastSplitS: tracker.splits.length ? tracker.splits[tracker.splits.length - 1] : null,
    recentSecPerKm: recent,
    targetSecPerKm: ctx.targetSecPerKm,
  });
  if (paced.cue?.kind === 'km') {
    run = { ...run, cueState: paced.state };
    text = t.cueKm(paced.cue.km, paced.cue.pace, paced.cue.target);
  } else if (!quiet) {
    // The activity start point: where my session's first fix was.
    const anchor =
      ctx.place ?? (run.fixes[0] ? { latitude: run.fixes[0].latitude, longitude: run.fixes[0].longitude } : null);
    const runners: Runner[] = ctx.others.flatMap((o) => {
      const progressM = progressOf(o.point, ctx.route, anchor);
      return progressM == null ? [] : [{ userId: o.userId, progressM, speedMps: o.speedMps }];
    });
    const gap = gapCue(ctx.userId, runners);
    const gapDue = run.lastGapCueAtMs == null || ctx.nowMs - run.lastGapCueAtMs >= OFF_TARGET_EVERY_MS;
    if (gap && gapDue) {
      run = { ...run, lastGapCueAtMs: ctx.nowMs };
      text = t.cueGap(gap.gapM, gap.pace);
    } else if (!gap && paced.cue) {
      run = { ...run, cueState: paced.state };
      text =
        paced.cue.kind === 'slow'
          ? t.cueSlow(paced.cue.pace, paced.cue.target)
          : t.cueFast(paced.cue.pace, paced.cue.target);
    }
  }
  if (text) run = { ...run, lastCueAtMs: ctx.nowMs };

  const save = ctx.nowMs - run.lastSavedAtMs >= SAVE_EVERY_MS;
  if (save) run = { ...run, lastSavedAtMs: ctx.nowMs };
  put(run);
  if (save) saveSession(summarize(run.tracker)).catch(() => {});
  if (text) speak(text);
}

/** Every few seconds: whether to open the "Everything okay?" status sheet. Returns true when it opened. */
export function checkStationary(key: string, nowMs: number, activityStartMs: number): boolean {
  const run = runs.get(key);
  if (!run) return false;
  const since = Math.max(activityStartMs, run.tracker.startedAt);
  if (!stationaryDue(run.fixes, nowMs, since, run.stationary)) return false;
  put({
    ...run,
    stationary: openStationary(run.stationary, nowMs),
    lastCueAtMs: nowMs,
  });
  speak(t.stationaryTitle);
  return true;
}

/** Dismiss, a picked status or Cancel: closed, no repeat for 10 minutes. */
export function closeStationaryPrompt(key: string, nowMs: number) {
  const run = runs.get(key);
  if (run) put({ ...run, stationary: closeStationary(nowMs) });
}
