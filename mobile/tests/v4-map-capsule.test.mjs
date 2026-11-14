// V4 Paper & Graphite: the Map Emergency capsule (docs/evidence/ux/paper-graphite-spec-2026-11-14.md).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('V4: emergencyBarMode treats map like the other non-chat screens (a line until opened)', async () => {
  const { emergencyBarMode } = await import('../src/lib/emergency-plan.ts');
  assert.equal(emergencyBarMode({ place: 'map', mine: false, acked: false, expanded: false }), 'line');
  assert.equal(emergencyBarMode({ place: 'map', mine: true, acked: false, expanded: false }), 'line');
  assert.equal(emergencyBarMode({ place: 'map', mine: false, acked: false, expanded: true }), 'bar');
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: false, expanded: false }), 'bar');
});

test('V4: map capsule is redwash, 48 pt, radius 24, lift shadow, no outline; bold name + on-the-way suffix, one line', () => {
  const r = src('components/room-activity.tsx');
  assert.match(r, /place\?: 'chat' \| 'other' \| 'map';/);
  assert.match(r, /if \(mode === 'line' && place === 'map'\)/);
  assert.match(r, /style=\{\(\{ pressed \}\) => \[styles\.capsule, lift,/);
  const capsule = r.match(/ {2}capsule: \{[^}]*\}/)[0];
  assert.match(capsule, /minHeight: 48/);
  assert.match(capsule, /backgroundColor: colors\.redwash/);
  assert.match(capsule, /borderRadius: 24/);
  assert.doesNotMatch(capsule, /borderWidth/);
  assert.match(r, /<Text style=\{styles\.capsuleName\}>\{name\}<\/Text>\s+\{en\.activity\.capsuleNeedsHelp\}/);
  assert.match(r, /numberOfLines=\{1\}\s+ellipsizeMode="tail"/);
  assert.match(r, /\{e\.onWay\.length > 0 \? en\.activity\.onWayLineSuffix\(e\.onWay\.length\) : ''\}\s+<\/Text>\s+<SymbolView name="chevron\.down"/);
  const en = src('i18n/en.ts');
  assert.match(en, /capsuleNeedsHelp: ' needs help',/);
  assert.match(en, /capsuleMine: 'You need help',/);
});

test('V4: map.tsx renders EmergencyAlerts with place="map", 16 pt from the sides (content padding 16)', () => {
  const m = src('app/room/[id]/map.tsx');
  assert.match(m, /<EmergencyAlerts\s+place="map"\s+roomId=\{room\.id\}/);
  assert.equal((m.match(/<EmergencyAlerts\b/g) ?? []).length, 1);
  assert.match(m, /^ {2}content: \{ padding: 16,/m);
});
