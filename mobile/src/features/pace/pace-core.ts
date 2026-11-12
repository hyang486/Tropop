// Qrewing AI pace maker (spec 3.4): the pure, on-device rules. No React Native imports, so `npm test` runs it.
// No model and no server: stats come from the user's own fixes, the lead group from live_presence rows.

export type Point = { latitude: number; longitude: number };
/** One position of mine, with its device time. */
export type PaceFix = Point & { atMs: number };

/** A finished or running session as stored in history (AsyncStorage `qrewing.pace.v1.history`). */
export type PaceSession = {
  roomId: string;
  /** Epoch ms. */
  startedAt: number;
  durationS: number;
  distanceM: number;
  /** Null under MIN_PACE_DISTANCE_M. */
  avgSecPerKm: number | null;
  /** Seconds each full km took, in order. */
  splits: number[];
};

export type PaceTarget =
  | { kind: 'usual' }
  | { kind: 'pace'; secPerKm: number }
  | { kind: 'time'; distanceM: number; timeS: number };

const EARTH_RADIUS_M = 6_371_000;
/** A step implying more than this (43 km/h) is GPS noise for a runner, not movement. */
export const MAX_STEP_SPEED_MPS = 12;
/** Under this distance a session has no meaningful average pace. */
export const MIN_PACE_DISTANCE_M = 100;
export const USUAL_PACE_SESSIONS = 5;
export const RECENT_WINDOW_MS = 60_000;
const MIN_RECENT_DISTANCE_M = 20;
/** Off-target cue: more than this share off the target pace ... */
export const OFF_TARGET_SHARE = 0.05;
/** ... at most this often. */
export const OFF_TARGET_EVERY_MS = 2 * 60_000;
export const LEAD_GROUP_SPAN_M = 50;
export const BEHIND_GAP_M = 150;
export const CATCH_UP_S = 3 * 60;
export const STATIONARY_RADIUS_M = 25;
export const STATIONARY_MS = 3 * 60_000;
export const STATIONARY_SNOOZE_MS = 10 * 60_000;
/** The newest fix must be this fresh to judge (the reporter sends a heartbeat every 30 s while still). */
const STATIONARY_FRESH_MS = 75_000;
/** A longer gap between fixes inside the window means the reporter was not running (app in background). */
const STATIONARY_MAX_GAP_MS = 90_000;

/** Great-circle distance in meters (same formula as lib/location-plan distanceMeters). */
export function distanceM(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "5:41" for 341 s per km; null when there is no finite pace. */
export function formatPace(secPerKm: number | null | undefined): string | null {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0) return null;
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** "Usual pace": the median average pace of the last 5 sessions that have one. */
export function usualPace(history: PaceSession[]): number | null {
  const paces = [...history]
    .sort((a, b) => b.startedAt - a.startedAt)
    .flatMap((s) => (s.avgSecPerKm != null && Number.isFinite(s.avgSecPerKm) ? [s.avgSecPerKm] : []))
    .slice(0, USUAL_PACE_SESSIONS);
  return median(paces);
}

export function targetSecPerKm(target: PaceTarget, usual: number | null): number | null {
  if (target.kind === 'usual') return usual;
  if (target.kind === 'pace') return target.secPerKm > 0 ? target.secPerKm : null;
  return target.distanceM > 0 && target.timeS > 0 ? target.timeS / (target.distanceM / 1000) : null;
}

// --- session tracker --------------------------------------------------------------------------------------------

export type Tracker = {
  roomId: string;
  startedAt: number;
  lastFix: PaceFix | null;
  lastAtMs: number;
  distanceM: number;
  splits: number[];
  /** When the last full km was crossed (startedAt before the first). */
  lastSplitAtMs: number;
};

export function newTracker(roomId: string, startedAt: number): Tracker {
  return { roomId, startedAt, lastFix: null, lastAtMs: startedAt, distanceM: 0, splits: [], lastSplitAtMs: startedAt };
}

/** Adds one fix; drops fixes that go back in time or imply a jump faster than MAX_STEP_SPEED_MPS. */
export function addFix(t: Tracker, fix: PaceFix): Tracker {
  if (!t.lastFix) return { ...t, lastFix: fix, lastAtMs: Math.max(t.lastAtMs, fix.atMs) };
  const dt = (fix.atMs - t.lastFix.atMs) / 1000;
  if (dt <= 0) return t;
  const step = distanceM(t.lastFix, fix);
  if (step / dt > MAX_STEP_SPEED_MPS) return t;
  const before = t.distanceM;
  const after = before + step;
  const splits = [...t.splits];
  let lastSplitAtMs = t.lastSplitAtMs;
  // Each km boundary crossed on this step, at the interpolated time.
  for (let km = Math.floor(before / 1000) + 1; km * 1000 <= after; km++) {
    const share = step > 0 ? (km * 1000 - before) / step : 1;
    const crossedAt = t.lastFix.atMs + share * dt * 1000;
    splits.push((crossedAt - lastSplitAtMs) / 1000);
    lastSplitAtMs = crossedAt;
  }
  return { ...t, lastFix: fix, lastAtMs: fix.atMs, distanceM: after, splits, lastSplitAtMs };
}

export function summarize(t: Tracker): PaceSession {
  const durationS = Math.max(0, Math.round((t.lastAtMs - t.startedAt) / 1000));
  const avgSecPerKm = t.distanceM >= MIN_PACE_DISTANCE_M && durationS > 0 ? durationS / (t.distanceM / 1000) : null;
  return { roomId: t.roomId, startedAt: t.startedAt, durationS, distanceM: t.distanceM, avgSecPerKm, splits: t.splits };
}

/** My pace over the last minute of fixes (path length), or null with too little movement. */
export function recentSecPerKm(fixes: PaceFix[], nowMs: number, windowMs = RECENT_WINDOW_MS): number | null {
  const inWindow = fixes.filter((f) => f.atMs >= nowMs - windowMs && f.atMs <= nowMs);
  if (inWindow.length < 2) return null;
  let path = 0;
  for (let i = 1; i < inWindow.length; i++) path += distanceM(inWindow[i - 1], inWindow[i]);
  const dt = (inWindow[inWindow.length - 1].atMs - inWindow[0].atMs) / 1000;
  if (path < MIN_RECENT_DISTANCE_M || dt <= 0) return null;
  return dt / (path / 1000);
}

// --- cues -------------------------------------------------------------------------------------------------------

export type PaceCueState = { lastKm: number; lastOffCueAtMs: number | null };
export type PaceCue =
  | { kind: 'km'; km: number; pace: string | null; target: string | null }
  | { kind: 'slow' | 'fast'; pace: string; target: string };

export function newPaceCueState(): PaceCueState {
  return { lastKm: 0, lastOffCueAtMs: null };
}

/**
 * At each new km: the km's split and the target. Otherwise, every OFF_TARGET_EVERY_MS at most, a cue when the
 * last minute's pace is more than 5% off the target: slower says pick it up, faster says ease off.
 */
export function paceCue(
  state: PaceCueState,
  input: { nowMs: number; km: number; lastSplitS: number | null; recentSecPerKm: number | null; targetSecPerKm: number | null },
): { state: PaceCueState; cue: PaceCue | null } {
  const target = formatPace(input.targetSecPerKm);
  if (input.km > state.lastKm) {
    return {
      state: { lastKm: input.km, lastOffCueAtMs: input.nowMs },
      cue: { kind: 'km', km: input.km, pace: formatPace(input.lastSplitS), target },
    };
  }
  const recent = input.recentSecPerKm;
  const goal = input.targetSecPerKm;
  if (recent == null || goal == null || !target) return { state, cue: null };
  if (state.lastOffCueAtMs != null && input.nowMs - state.lastOffCueAtMs < OFF_TARGET_EVERY_MS) return { state, cue: null };
  if (Math.abs(recent - goal) / goal <= OFF_TARGET_SHARE) return { state, cue: null };
  const pace = formatPace(recent);
  if (!pace) return { state, cue: null };
  return {
    state: { ...state, lastOffCueAtMs: input.nowMs },
    cue: { kind: recent > goal ? 'slow' : 'fast', pace, target },
  };
}

// --- lead group -------------------------------------------------------------------------------------------------

/** Meters along the route to the point's projection on the nearest segment (flat projection per segment). */
export function progressAlongRoute(point: Point, route: Point[]): number {
  if (route.length < 2) return 0;
  const rad = Math.PI / 180;
  const kx = Math.cos(point.latitude * rad) * rad * EARTH_RADIUS_M;
  const ky = rad * EARTH_RADIUS_M;
  const xy = (p: Point) => ({ x: p.longitude * kx, y: p.latitude * ky });
  const q = xy(point);
  let best = { dist: Infinity, progress: 0 };
  let along = 0;
  for (let i = 1; i < route.length; i++) {
    const a = xy(route[i - 1]);
    const b = xy(route[i]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / len2)) : 0;
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const dist = Math.hypot(q.x - px, q.y - py);
    const segLen = distanceM(route[i - 1], route[i]);
    if (dist < best.dist) best = { dist, progress: along + t * segLen };
    along += segLen;
  }
  return best.progress;
}

/**
 * How far along a member is: along the room's route when it has 2+ points, otherwise the distance from the
 * anchor (the room's place pin, or where the activity started); null with neither.
 */
export function progressOf(point: Point, route: Point[], anchor: Point | null): number | null {
  if (route.length >= 2) return progressAlongRoute(point, route);
  return anchor ? distanceM(anchor, point) : null;
}

export type Runner = { userId: string; progressM: number; speedMps: number | null };
export type LeadGroup = { members: string[]; frontM: number; rearM: number; speedMps: number | null };

/** Members within LEAD_GROUP_SPAN_M of the front-most member. */
export function leadGroup(runners: Runner[]): LeadGroup | null {
  if (runners.length === 0) return null;
  const frontM = Math.max(...runners.map((r) => r.progressM));
  const inGroup = runners.filter((r) => r.progressM >= frontM - LEAD_GROUP_SPAN_M);
  const speeds = inGroup.flatMap((r) => (r.speedMps != null && Number.isFinite(r.speedMps) && r.speedMps >= 0 ? [r.speedMps] : []));
  return {
    members: inGroup.map((r) => r.userId),
    frontM,
    rearM: Math.min(...inGroup.map((r) => r.progressM)),
    speedMps: speeds.length ? speeds.reduce((s, v) => s + v, 0) / speeds.length : null,
  };
}

export type GapCue = { gapM: number; secPerKm: number; pace: string };

/**
 * More than BEHIND_GAP_M behind the lead group's last member: the pace that closes the gap in CATCH_UP_S at the
 * group's average speed (the gap alone when no group speed is known).
 */
export function gapCue(myId: string, runners: Runner[]): GapCue | null {
  const me = runners.find((r) => r.userId === myId);
  const group = leadGroup(runners);
  if (!me || !group || group.members.includes(myId)) return null;
  const gapM = Math.round(group.rearM - me.progressM);
  if (gapM <= BEHIND_GAP_M) return null;
  const needed = (group.speedMps ?? 0) + gapM / CATCH_UP_S;
  const secPerKm = 1000 / needed;
  const pace = formatPace(secPerKm);
  return pace ? { gapM, secPerKm, pace } : null;
}

// --- stationary -------------------------------------------------------------------------------------------------

export type StationaryState = { openSinceMs: number | null; snoozeUntilMs: number | null };

export function newStationaryState(): StationaryState {
  return { openSinceMs: null, snoozeUntilMs: null };
}

export function withinStationaryRadius(fixes: Point[], radiusM = STATIONARY_RADIUS_M): boolean {
  if (fixes.length === 0) return false;
  return fixes.every((f) => distanceM(fixes[0], f) <= radiusM);
}

/**
 * Whether to ask "Everything okay?": during the activity, my fixes covered the last 3 minutes (one at or
 * before its start, no long gaps, the newest fresh) and all stayed within 25 m. Not while the prompt is open
 * or snoozed after Dismiss. It only opens the status sheet; it never sets a status by itself.
 */
export function stationaryDue(
  fixes: PaceFix[],
  nowMs: number,
  activityStartMs: number,
  state: StationaryState,
): boolean {
  if (state.openSinceMs != null) return false;
  if (state.snoozeUntilMs != null && nowMs < state.snoozeUntilMs) return false;
  const windowStart = nowMs - STATIONARY_MS;
  if (windowStart < activityStartMs) return false;
  const sorted = fixes.filter((f) => f.atMs <= nowMs).sort((a, b) => a.atMs - b.atMs);
  const newest = sorted[sorted.length - 1];
  if (!newest || nowMs - newest.atMs > STATIONARY_FRESH_MS) return false;
  let anchorIndex = -1;
  for (let i = 0; i < sorted.length; i++) if (sorted[i].atMs <= windowStart) anchorIndex = i;
  if (anchorIndex < 0) return false;
  const window = sorted.slice(anchorIndex);
  for (let i = 1; i < window.length; i++) if (window[i].atMs - window[i - 1].atMs > STATIONARY_MAX_GAP_MS) return false;
  return withinStationaryRadius(window);
}

export function openStationary(state: StationaryState, nowMs: number): StationaryState {
  return { ...state, openSinceMs: nowMs };
}

/** Dismiss or a picked status: closed, and no repeat for STATIONARY_SNOOZE_MS. */
export function closeStationary(nowMs: number): StationaryState {
  return { openSinceMs: null, snoozeUntilMs: nowMs + STATIONARY_SNOOZE_MS };
}

// --- history ----------------------------------------------------------------------------------------------------

export const HISTORY_LIMIT = 20;

/** Adds or replaces (same room and start) a session; newest first, at most HISTORY_LIMIT kept. */
export function mergeSession(history: PaceSession[], session: PaceSession): PaceSession[] {
  const rest = history.filter((s) => !(s.roomId === session.roomId && s.startedAt === session.startedAt));
  return [session, ...rest].sort((a, b) => b.startedAt - a.startedAt).slice(0, HISTORY_LIMIT);
}

/** Parses stored history, dropping anything malformed. */
export function parseHistory(raw: string | null): PaceSession[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (s): s is PaceSession =>
        !!s &&
        typeof s === 'object' &&
        typeof s.roomId === 'string' &&
        Number.isFinite(s.startedAt) &&
        Number.isFinite(s.durationS) &&
        Number.isFinite(s.distanceM) &&
        (s.avgSecPerKm === null || Number.isFinite(s.avgSecPerKm)) &&
        Array.isArray(s.splits),
    );
  } catch {
    return [];
  }
}

/** The recap's pace part: the latest session in this room that has an average pace (100 m or more), or null. */
export function summaryFor(
  history: PaceSession[],
  roomId: string,
): { distanceM: number; durationS: number; avgSecPerKm: number } | null {
  const s = [...history]
    .sort((a, b) => b.startedAt - a.startedAt)
    .find((x) => x.roomId === roomId && x.avgSecPerKm != null);
  return s && s.avgSecPerKm != null
    ? { distanceM: Math.round(s.distanceM), durationS: s.durationS, avgSecPerKm: Math.round(s.avgSecPerKm) }
    : null;
}

// --- target input -----------------------------------------------------------------------------------------------

/** "5:30" -> 330 s per km. Minutes 1-30, seconds 0-59. */
export function parsePace(text: string): number | null {
  const m = /^\s*(\d{1,2}):([0-5]\d)\s*$/.exec(text);
  if (!m) return null;
  const s = Number(m[1]) * 60 + Number(m[2]);
  return s >= 60 && s <= 30 * 60 ? s : null;
}

/** "50:00" or "1:45:00" -> seconds; null otherwise. */
export function parseDuration(text: string): number | null {
  const m = /^\s*(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)\s*$/.exec(text);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  if (m[1] && min > 59) return null;
  const s = h * 3600 + min * 60 + Number(m[3]);
  return s > 0 ? s : null;
}

/** "10" or "21.1" (or "21,1") km -> meters, 0.1-200 km. */
export function parseKm(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0.1 && n <= 200 ? Math.round(n * 1000) : null;
}

/** "12:05" or "1:02:05" for a duration in seconds. */
export function formatDuration(totalS: number): string {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
