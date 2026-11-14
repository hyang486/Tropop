// Run: npm test. UX P1-9: pace stats, the one-row target with its pace bar, and each person's gap to me.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { personGap } from '../src/features/pace/pace-core.ts';
import { TARGET_TICK, targetBarFill } from '../src/features/pace/target-form.ts';

const route = [
  { latitude: 37.0, longitude: -122.0 },
  { latitude: 37.01, longitude: -122.0 },
]; // about 1.11 km north
const at = (m) => ({ latitude: 37.0 + m / 111_195, longitude: -122.0 });

test('personGap: along the route, behind / ahead / with you', () => {
  assert.equal(personGap(null, at(100), route), null);
  assert.deepEqual(personGap(at(500), at(520), route), { kind: 'with' });
  const behind = personGap(at(500), at(300), route);
  assert.equal(behind.kind, 'behind');
  assert.ok(Math.abs(behind.meters - 200) < 2);
  assert.equal(personGap(at(300), at(500), route).kind, 'ahead');
});

test('personGap: without a route, straight-line distance', () => {
  assert.deepEqual(personGap(at(0), at(30), []), { kind: 'with' });
  const away = personGap(at(0), at(400), []);
  assert.equal(away.kind, 'away');
  assert.ok(Math.abs(away.meters - 400) < 2);
});

test('targetBarFill: on target fills to the tick, faster past it, slower short of it, clamped', () => {
  assert.equal(targetBarFill(null, 300), null);
  assert.equal(targetBarFill(300, null), null);
  assert.equal(targetBarFill(300, 300), TARGET_TICK);
  assert.ok(targetBarFill(270, 300) > TARGET_TICK);
  assert.ok(targetBarFill(360, 300) < TARGET_TICK);
  assert.equal(targetBarFill(100, 300), 1);
});

test('screens: 34 pt stats, one target row with an Edit sheet, gap labels on the people list', () => {
  const card = readFileSync(new URL('../src/features/pace/pace-card.tsx', import.meta.url), 'utf8');
  const map = readFileSync(new URL('../src/app/room/[id]/map.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/components/ui.tsx', import.meta.url), 'utf8');
  assert.match(ui, /stat: \{ fontSize: 34, fontWeight: '700', fontVariant: \['tabular-nums'\]/);
  assert.match(card, /<Text style=\{textRole\.stat\}/);
  assert.match(card, /minHeight: size\.rowSubtitle/);
  assert.match(card, /<TargetRow target=/);
  assert.match(card, /<Modal visible=\{editing\}/);
  assert.match(card, /<TargetEditor target=\{target\}/);
  assert.match(map, /personGap\(meNow, /);
  assert.match(map, /stale \? en\.map\.stale\(age\) : gap \? gapLabel\(gap\) : speed/);
  assert.doesNotMatch(map, /en\.map\.updated\(age\)/);
});
