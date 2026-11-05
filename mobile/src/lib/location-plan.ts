// Pure helpers for live location sharing (no React Native imports, so `npm test` can load them).

export type LatLng = { latitude: number; longitude: number };
export type Fix = LatLng & { atMs: number };

/** Never report more often than this (L4). */
export const REPORT_MIN_INTERVAL_MS = 5_000;
/** A new fix closer than this to the last report is not sent, except as a heartbeat. */
export const REPORT_MIN_DISTANCE_M = 10;
/** A member who has not moved still re-sends the last fix this often, so others do not see them as stale. */
export const HEARTBEAT_MS = 30_000;
/** Other members show "Location stale" once the server row is older than this. */
export const STALE_AFTER_MS = 60_000;
/** Presence change notices arrive per report; refetch at most once per this window. */
export const PRESENCE_REFETCH_DEBOUNCE_MS = 1_500;
/** Server limit in set_route (migration 0020). */
export const MAX_ROUTE_POINTS = 2000;

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Whether a fix should be sent now. `lastSent` is the last report that reached the server.
 * Throttled to one report per REPORT_MIN_INTERVAL_MS; inside that, a move of REPORT_MIN_DISTANCE_M or
 * a HEARTBEAT_MS gap is needed.
 */
export function shouldReport(lastSent: Fix | null, next: LatLng, nowMs: number): boolean {
  if (!isValidLatLng(next)) return false;
  if (!lastSent) return true;
  const elapsed = nowMs - lastSent.atMs;
  if (elapsed < REPORT_MIN_INTERVAL_MS) return false;
  if (elapsed >= HEARTBEAT_MS) return true;
  return distanceMeters(lastSent, next) >= REPORT_MIN_DISTANCE_M;
}

export function isValidLatLng(p: LatLng | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}

export function isStale(updatedAtIso: string, nowMs: number): boolean {
  const t = Date.parse(updatedAtIso);
  return !Number.isFinite(t) || nowMs - t > STALE_AFTER_MS;
}

/** "just now", "2 min ago", "1 h ago". */
export function formatAge(updatedAtIso: string, nowMs: number): string {
  const t = Date.parse(updatedAtIso);
  if (!Number.isFinite(t)) return 'unknown';
  const minutes = Math.floor(Math.max(0, nowMs - t) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}

/** Speed in km/h with one decimal, or null when unknown. Never call this for a stale row. */
export function formatSpeedKmh(mps: number | null | undefined): string | null {
  if (mps == null || !Number.isFinite(mps) || mps < 0) return null;
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

/** rooms.route (jsonb) as map coordinates. Anything malformed is skipped. */
export function parseRoute(route: unknown): LatLng[] {
  if (!Array.isArray(route)) return [];
  const out: LatLng[] = [];
  for (const p of route) {
    if (p && typeof p === 'object') {
      const { lat, lng } = p as { lat?: unknown; lng?: unknown };
      const point = { latitude: Number(lat), longitude: Number(lng) };
      if (typeof lat === 'number' && typeof lng === 'number' && isValidLatLng(point)) out.push(point);
    }
  }
  return out;
}

/** Map coordinates as the set_route payload. */
export function toRoutePayload(points: LatLng[]): { lat: number; lng: number }[] {
  return points.filter(isValidLatLng).slice(0, MAX_ROUTE_POINTS).map((p) => ({ lat: p.latitude, lng: p.longitude }));
}

/** Camera center for a set of points (their bounding-box middle), or null when empty. */
export function centerOf(points: LatLng[]): LatLng | null {
  const valid = points.filter(isValidLatLng);
  if (valid.length === 0) return null;
  const lats = valid.map((p) => p.latitude);
  const lngs = valid.map((p) => p.longitude);
  return {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}

/**
 * M7: what a read of the user's own room_members.share_location may change. The read and the
 * set_share_location RPC are separate requests, so a read that overlaps an opt-in (pending) or
 * started before consent last changed (generation moved) can see an old value: it is ignored, and
 * the store change after the RPC triggers a fresh read.
 */
export type ShareRead = {
  server: boolean;
  consented: boolean;
  pending: boolean;
  genAtStart: number;
  genNow: number;
};
export type ShareDecision = 'ignore' | 'on' | 'off' | 'drop-consent' | 'turn-off-server';

export function reconcileShare({ server, consented, pending, genAtStart, genNow }: ShareRead): ShareDecision {
  if (pending || genAtStart !== genNow) return 'ignore';
  if (server) return consented ? 'on' : 'turn-off-server';
  return consented ? 'drop-consent' : 'off';
}
