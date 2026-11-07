// R-1 freehand route drawing: pure rules (no React Native imports, so node --test can load them).
// Type-only import: erased by Node's type stripping, so this file still loads alone under node --test.
import type { LatLng } from './location-plan';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** The visible map region as expo-maps reports it in onCameraMove (after each camera move ends). */
export type MapRegion = {
  center: LatLng;
  longitudeDelta: number;
  zoom: number;
  bearing: number;
  tilt: number;
};

/** Fingers closer together than this (points) add no new stroke point. */
export const MIN_STEP_PT = 4;
/** Douglas-Peucker tolerance in screen points: wobble under this is dropped from a finished stroke. */
export const SIMPLIFY_TOLERANCE_PT = 1.5;
const ANGLE_EPSILON_DEG = 0.5;
const MAX_MERCATOR_LAT = 85.05112878;

/**
 * The screen-to-map conversion below is exact only for a flat, north-up map. While the map is rotated or
 * tilted the reported span is a bounding box, so the pen first snaps the camera flat and north-up.
 */
export function isFlatNorthUp(region: MapRegion): boolean {
  const heading = ((region.bearing % 360) + 360) % 360;
  const rotated = Math.min(heading, 360 - heading) > ANGLE_EPSILON_DEG;
  return !rotated && Math.abs(region.tilt) <= ANGLE_EPSILON_DEG;
}

/**
 * A point on the map view (origin top-left, in points) as coordinates, for a flat north-up Web Mercator map
 * whose center and longitude span are `region`. Mercator is conformal, so one scale (view width over the
 * longitude span in radians) serves both axes. Null when the region or size is unusable.
 */
export function screenToLatLng(point: Point, size: Size, region: MapRegion): LatLng | null {
  const { width, height } = size;
  const span = region.longitudeDelta;
  if (!(width > 0) || !(height > 0) || !(span > 0) || !Number.isFinite(span)) return null;
  const scale = width / ((span * Math.PI) / 180); // points per radian
  const dx = point.x - width / 2;
  const dy = point.y - height / 2;

  let longitude = region.center.longitude + ((dx / scale) * 180) / Math.PI;
  longitude = ((((longitude + 180) % 360) + 360) % 360) - 180;

  const centerLat = (clamp(region.center.latitude, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT) * Math.PI) / 180;
  const centerY = Math.log(Math.tan(Math.PI / 4 + centerLat / 2));
  const y = centerY - dy / scale; // screen y grows downward, Mercator y grows northward
  const latitude = clamp(((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** Adds a finger position to the live stroke unless it is within MIN_STEP_PT of the last one. */
export function addStrokePoint(stroke: Point[], next: Point, minStep = MIN_STEP_PT): Point[] {
  const last = stroke[stroke.length - 1];
  if (last && Math.hypot(next.x - last.x, next.y - last.y) < minStep) return stroke;
  return [...stroke, next];
}

/** Douglas-Peucker: drops points that lie within `tolerance` of the line through their neighbours. */
export function simplifyStroke(points: Point[], tolerance = SIMPLIFY_TOLERANCE_PT): Point[] {
  if (points.length <= 2) return points.slice();
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let worst = -1;
    let worstDistance = 0;
    for (let i = start + 1; i < end; i++) {
      const d = distanceToSegment(points[i], points[start], points[end]);
      if (d > worstDistance) {
        worstDistance = d;
        worst = i;
      }
    }
    if (worst !== -1 && worstDistance > tolerance) {
      keep[worst] = true;
      stack.push([start, worst], [worst, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * A finished stroke as route coordinates: simplified on screen, then converted. A tap (a single point) is
 * kept as one point, so a stroke after it joins it. Points that fail to convert are skipped.
 */
export function strokeToRoute(stroke: Point[], size: Size, region: MapRegion): LatLng[] {
  return simplifyStroke(stroke)
    .map((p) => screenToLatLng(p, size, region))
    .filter((p): p is LatLng => p !== null);
}

/** The saved route is one line: strokes are joined end to start, in the order they were drawn. */
export function joinStrokes(strokes: LatLng[][]): LatLng[] {
  return strokes.flat();
}

/**
 * Adds a finished stroke to the draft. The whole route must stay within `max` points (MAX_ROUTE_POINTS:
 * set_route rejects more), so a stroke that would pass it is cut at the limit and `truncated` is set.
 */
export function appendStroke(
  strokes: LatLng[][],
  stroke: LatLng[],
  max: number,
): { strokes: LatLng[][]; truncated: boolean } {
  if (stroke.length === 0) return { strokes, truncated: false };
  const room = max - joinStrokes(strokes).length;
  if (room <= 0) return { strokes, truncated: true };
  const kept = stroke.slice(0, room);
  return { strokes: [...strokes, kept], truncated: kept.length < stroke.length };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lengthSquared = vx * vx + vy * vy;
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / lengthSquared, 0, 1);
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
