// Run: npm test (node --test, Node 24 strips the .ts types).
// Qrewing Calendar drawing geometry: seeded wobble, highlighter caps, month layout, week segments.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  gridLinePaths,
  highlighterPath,
  monthInfo,
  seededRandom,
  weekSegments,
  wobblyLine,
} from '../src/components/calendar/sketch.ts';

test('the same seed draws the same lines; another seed draws different ones', () => {
  assert.deepEqual(gridLinePaths(5, 48, 64, 'nov'), gridLinePaths(5, 48, 64, 'nov'));
  assert.notDeepEqual(gridLinePaths(5, 48, 64, 'nov'), gridLinePaths(5, 48, 64, 'dec'));
  assert.equal(highlighterPath(120, 14, 'round', 'flat', 'a'), highlighterPath(120, 14, 'round', 'flat', 'a'));
  const r = seededRandom('x');
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test('grid: weeks + 1 rows and 8 columns of lines', () => {
  assert.equal(gridLinePaths(5, 48, 64, 's').length, 6 + 8);
  assert.equal(gridLinePaths(6, 48, 64, 's').length, 7 + 8);
});

test('wobbly line stays near the straight line and near its ends', () => {
  const d = wobblyLine(0, 10, 300, 10, seededRandom('w'), 1.2);
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const xs = nums.filter((_, i) => i % 2 === 0);
  for (const y of ys) assert.ok(Math.abs(y - 10) <= 1.25, `y ${y}`);
  assert.ok(Math.abs(xs[0]) <= 1.25);
  assert.ok(Math.abs(xs[xs.length - 1] - 300) <= 1.25);
});

test('highlighter: arcs only on round caps, straight cut on flat ones, inside its box', () => {
  const arcs = (d) => (d.match(/A/g) ?? []).length;
  assert.equal(arcs(highlighterPath(100, 14, 'round', 'round', 's')), 2);
  assert.equal(arcs(highlighterPath(100, 14, 'round', 'flat', 's')), 1);
  assert.equal(arcs(highlighterPath(100, 14, 'flat', 'flat', 's')), 0);
  const flat = highlighterPath(100, 14, 'flat', 'flat', 's');
  assert.match(flat, / L100 /);
  assert.match(flat, / L0 /);
  const xs = flat.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 0);
  for (const x of xs) assert.ok(x >= 0 && x <= 100);
  assert.equal(highlighterPath(0, 14, 'round', 'round', 's'), '');
  // Narrower than its height: the caps shrink instead of crossing.
  assert.ok(highlighterPath(8, 14, 'round', 'round', 's').includes('A4 '));
});

test('monthInfo: November 2026 starts on a Sunday, 30 days, 5 rows', () => {
  assert.deepEqual(monthInfo(2026, 10), { firstCol: 0, daysInMonth: 30, weeks: 5 });
  assert.deepEqual(monthInfo(2026, 10, 1), { firstCol: 6, daysInMonth: 30, weeks: 6 });
  assert.equal(monthInfo(2027, 1).daysInMonth, 28);
});

test('weekSegments: one row, two rows, clamped ends, emoji on the middle day', () => {
  const nov = monthInfo(2026, 10); // Sun Nov 1
  assert.deepEqual(weekSegments(nov, 15, 17), [
    { row: 2, colStart: 0, colEnd: 2, startCap: 'round', endCap: 'round', emoji: true },
  ]);
  // Fri 20 - Mon 23: cut at the week wrap; the middle day (21) is in the first row.
  assert.deepEqual(weekSegments(nov, 20, 23), [
    { row: 2, colStart: 5, colEnd: 6, startCap: 'round', endCap: 'flat', emoji: true },
    { row: 3, colStart: 0, colEnd: 1, startCap: 'flat', endCap: 'round', emoji: false },
  ]);
  // Began last month, runs into next month: flat on both clamped sides.
  const all = weekSegments(nov, -2, 33);
  assert.equal(all.length, 5);
  assert.equal(all[0].startCap, 'flat');
  assert.equal(all[4].endCap, 'flat');
  assert.equal(all.filter((s) => s.emoji).length, 1);
  assert.deepEqual(weekSegments(nov, 31, 40), []);
  assert.deepEqual(weekSegments(nov, 5, 4), []);
  // A single day.
  assert.deepEqual(weekSegments(nov, 30, 30), [
    { row: 4, colStart: 1, colEnd: 1, startCap: 'round', endCap: 'round', emoji: true },
  ]);
});
