// Qrewing Calendar: pure geometry for the hand-drawn pieces (unit tested in tests/calendar-sketch.test.mjs).
// Every wobble comes from a seeded generator, so the same seed draws the same path on every render.

export type Cap = 'round' | 'flat';

/** FNV-1a hash of the seed, then mulberry32: a stable stream of numbers in [0, 1). */
export function seededRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number) => +v.toFixed(1);
/** A value in [-amp, amp]. */
const jitter = (rand: () => number, amp: number) => (rand() * 2 - 1) * amp;

/**
 * A slightly wobbly hand-drawn line from (x1, y1) to (x2, y2): bends every ~40 px by up to `amp` across the line,
 * ends that miss the exact point by a little (overshoot up to `amp`), joined with smooth quadratic curves.
 */
export function wobblyLine(x1: number, y1: number, x2: number, y2: number, rand: () => number, amp = 1.2): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return `M${n(x1)} ${n(y1)}`;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const steps = Math.max(2, Math.round(len / 40));
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const along = (len * i) / steps + (i === 0 || i === steps ? jitter(rand, amp) : 0);
    const across = jitter(rand, amp);
    pts.push([x1 + ux * along - uy * across, y1 + uy * along + ux * across]);
  }
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${n(pts[i][0])} ${n(pts[i][1])} ${n(mx)} ${n(my)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${n(last[0])} ${n(last[1])}`;
}

/**
 * The month grid's lines: weeks + 1 horizontal and 8 vertical lines over a 7 × weeks grid of cells, each its own
 * wobbly path (offset by `pad` so the wobble at the outer edge is not clipped).
 */
export function gridLinePaths(weeks: number, cellWidth: number, cellHeight: number, seed: string, pad = 0): string[] {
  const rand = seededRandom(`grid:${seed}:${weeks}:${cellWidth}:${cellHeight}`);
  const w = cellWidth * 7;
  const h = cellHeight * weeks;
  const paths: string[] = [];
  for (let r = 0; r <= weeks; r++) paths.push(wobblyLine(pad, pad + r * cellHeight, pad + w, pad + r * cellHeight, rand));
  for (let c = 0; c <= 7; c++) paths.push(wobblyLine(pad + c * cellWidth, pad, pad + c * cellWidth, pad + h, rand));
  return paths;
}

/**
 * A highlighter band filling 0..width × 0..height: uneven top and bottom edges (up to 12% of the height inward),
 * a round cap (radius height / 2) on a side that is the range's real start or end, and a straight cut on a side
 * where the range wraps to another week row.
 */
export function highlighterPath(width: number, height: number, startCap: Cap, endCap: Cap, seed: string): string {
  if (width <= 0 || height <= 0) return '';
  const rand = seededRandom(`hl:${seed}:${width}:${height}`);
  const r = Math.min(height / 2, width / 2);
  const left = startCap === 'round' ? r : 0;
  const right = endCap === 'round' ? width - r : width;
  const edge = height * 0.12;
  const steps = Math.max(1, Math.round((right - left) / 24));
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = left + ((right - left) * i) / steps;
    top.push([x, rand() * edge]);
    bottom.push([x, height - rand() * edge]);
  }
  const [lx, ly] = top[0];
  const [rx, ry] = top[top.length - 1];
  const [, rby] = bottom[bottom.length - 1];
  const [, lby] = bottom[0];
  let d = `M${n(lx)} ${n(ly)}`;
  for (const [x, y] of top.slice(1)) d += ` L${n(x)} ${n(y)}`;
  d += endCap === 'round' ? ` A${n(r)} ${n((rby - ry) / 2)} 0 0 1 ${n(rx)} ${n(rby)}` : ` L${n(width)} ${n(ry)} L${n(width)} ${n(rby)} L${n(rx)} ${n(rby)}`;
  for (const [x, y] of bottom.slice(0, -1).reverse()) d += ` L${n(x)} ${n(y)}`;
  d += startCap === 'round' ? ` A${n(r)} ${n((lby - ly) / 2)} 0 0 1 ${n(lx)} ${n(ly)}` : ` L0 ${n(lby)} L0 ${n(ly)}`;
  return `${d} Z`;
}

export type MonthInfo = { firstCol: number; daysInMonth: number; weeks: number };

/** Where day 1 sits (0 = first column) and how many week rows the month needs; month0 is 0-11. */
export function monthInfo(year: number, month0: number, weekStartsOn = 0): MonthInfo {
  const firstCol = (new Date(year, month0, 1).getDay() - weekStartsOn + 7) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return { firstCol, daysInMonth, weeks: Math.ceil((firstCol + daysInMonth) / 7) };
}

export type WeekSegment = { row: number; colStart: number; colEnd: number; startCap: Cap; endCap: Cap; emoji: boolean };

/**
 * A day range split into one segment per week row of the shown month. Days outside 1..daysInMonth (a room that
 * began last month, -2, or runs into next month, 33) are clamped, and the clamped side gets a flat cap, as does
 * every week-wrap cut. `emoji` marks the one segment that holds the range's middle day (of the shown part).
 * Null-safe: a range entirely outside the month, or with end < start, gives [].
 */
export function weekSegments(info: MonthInfo, startDay: number, endDay: number): WeekSegment[] {
  if (endDay < startDay) return [];
  const s = Math.max(1, startDay);
  const e = Math.min(info.daysInMonth, endDay);
  if (e < s) return [];
  const mid = Math.floor((s + e) / 2);
  const pos = (day: number) => info.firstCol + day - 1;
  const out: WeekSegment[] = [];
  let day = s;
  while (day <= e) {
    const row = Math.floor(pos(day) / 7);
    const last = Math.min(e, day + (6 - (pos(day) % 7)));
    out.push({
      row,
      colStart: pos(day) % 7,
      colEnd: pos(last) % 7,
      startCap: day === startDay ? 'round' : 'flat',
      endCap: last === endDay ? 'round' : 'flat',
      emoji: mid >= day && mid <= last,
    });
    day = last + 1;
  }
  return out;
}

/**
 * One VoiceOver element per room: keys (`itemId:row`) of each item's first visible week-row segment. Pass only the
 * segments that are drawn, so a room whose first row is hidden still gets one element.
 */
export function primarySegments(segments: readonly { itemId: string; row: number }[]): Set<string> {
  const first = new Map<string, number>();
  for (const s of segments) {
    const r = first.get(s.itemId);
    if (r == null || s.row < r) first.set(s.itemId, s.row);
  }
  return new Set([...first].map(([id, row]) => `${id}:${row}`));
}

/** Accessibility props for one stroke segment: the primary one is a labelled button; the rest stay tappable but are hidden from VoiceOver. */
export function strokeA11y(primary: boolean, label: string | undefined) {
  return primary
    ? { accessible: true, accessibilityRole: 'button' as const, accessibilityLabel: label }
    : { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
}
