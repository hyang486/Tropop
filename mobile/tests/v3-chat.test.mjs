// V3 Paper & Graphite: Chat + Emergency (docs/evidence/ux/paper-graphite-spec-2026-11-14.md).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const block = (s, name) => s.match(new RegExp(`\\n  ${name}: \\{[^}]*\\}`))[0];

test('V3 bubbles: radius 18; mine ink, tail bottom-right 6; others lift + lift shadow, tail bottom-left 6', () => {
  const c = src('app/room/[id]/index.tsx');
  assert.match(c, /bubble: \{ borderRadius: 18,/);
  assert.match(c, /mine: \{ backgroundColor: colors\.tint, borderBottomRightRadius: 6 \}/);
  assert.match(c, /theirs: \{ backgroundColor: colors\.lift, borderBottomLeftRadius: 6 \}/);
  assert.match(c, /mine \? styles\.mine : \[styles\.theirs, lift\]/);
});

test('V3 system lines: wash capsule, radius 10, 4 x 10 padding, centred', () => {
  const n = block(src('app/room/[id]/index.tsx'), 'noticeRow');
  assert.match(n, /alignSelf: 'center'/);
  assert.match(n, /paddingVertical: 4,\s+paddingHorizontal: 10,\s+borderRadius: 10,/);
  assert.match(n, /backgroundColor: colors\.wash/);
});

test('V3 composer floats: lift pill 54 / radius 27, 12 pt sides, 110 pt fade, list inset follows the dock', () => {
  const c = src('app/room/[id]/index.tsx');
  assert.match(block(c, 'composerDock'), /position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12/);
  assert.match(block(c, 'composerFade'), /height: 110/);
  assert.match(c, /linear-gradient\(\$\{paper\}00 0%, \$\{paper\} 55%, \$\{paper\} 100%\)/);
  const pill = block(c, 'composer');
  assert.match(pill, /minHeight: 54/);
  assert.match(pill, /borderRadius: 27/);
  assert.match(pill, /backgroundColor: colors\.lift/);
  assert.match(c, /<View style=\{\[styles\.composer, lift\]\}>/);
  assert.match(c, /Math\.max\(insets\.bottom, 12\)/);
  assert.match(c, /paddingTop: dockHeight \+ 12/);
  assert.match(block(c, 'plusButton'), /width: 40,\s+height: 40,\s+borderRadius: 20,\s+backgroundColor: colors\.wash/);
  assert.match(c, /<Composer\s+inPill/);
  const comp = src('components/composer.tsx');
  assert.match(comp, /fieldInPill: \{ minHeight: 40, borderRadius: 0, backgroundColor: 'transparent'/);
  assert.match(comp, /slotInPill: \{ width: 40, height: 40, marginBottom: 0 \}/);
});

test('V3 Emergency card: redwash, radius 22, lift, no frame; 40 pt danger disc with a 6 pt 20% halo', () => {
  const r = src('components/room-activity.tsx');
  const bar = block(r, 'bar');
  assert.match(bar, /backgroundColor: colors\.redwash/);
  assert.match(bar, /borderRadius: radius\.card/);
  assert.doesNotMatch(bar, /borderWidth/);
  assert.match(r, /<View style=\{\[styles\.bar, lift\]\} accessibilityRole="alert">/);
  const disc = block(r, 'disc');
  assert.match(disc, /width: 40,\s+height: 40,/);
  assert.match(disc, /backgroundColor: colors\.danger/);
  assert.match(disc, /boxShadow: '0 0 0 6px rgba\(255, 59, 48, 0\.2\)'/);
  assert.match(r, /barTitle: \{ fontSize: 17, fontWeight: '600'/);
  assert.match(r, /barLocationLink: \{ textDecorationLine: 'underline' \}/);
  assert.match(r, /pillSecondary: \{ backgroundColor: colors\.lift \}/);
});
