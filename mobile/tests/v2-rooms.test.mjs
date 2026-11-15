// V2 Paper & Graphite: Rooms home (docs/evidence/ux/paper-graphite-spec-2026-11-14.md).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('V2: Join (primary) + Create (secondary) with scan / plus icons, equal width, 10 pt gap', () => {
  const h = src('app/index.tsx');
  assert.match(h, /<Button compact icon="qrcode\.viewfinder" title=\{en\.home\.joinShort\}/);
  assert.match(h, /icon="plus"\s+title=\{en\.home\.createShort\}\s+variant="secondary"/);
  assert.match(h, /pair: \{ flexDirection: 'row', gap: 10/);
  const ui = src('components/ui.tsx');
  assert.match(ui, /icon\?: SFSymbol;/);
  assert.match(ui, /<SymbolView name=\{icon\} size=\{17\} weight="semibold" tintColor=\{label\} \/>/);
});

test('V2: header is one shared glass pill with Calendar + Profile icons, no avatar text', () => {
  const h = src('app/index.tsx');
  assert.doesNotMatch(h, /separateBackground|initialOf|avatarText/);
  assert.match(h, /<Stack\.Toolbar\.Button\s+icon="calendar"/);
  assert.match(h, /<Stack\.Toolbar\.Button icon="person" accessibilityLabel=\{en\.home\.profile\}/);
});

test('V2: each section is one Card; rows have no border; 48 pt wash art tile, radius 14; row min 76', () => {
  const h = src('app/index.tsx');
  assert.match(h, /<Card>\s+\{sortEmergencyFirst\(\s+sortByLastItem\(/);
  assert.match(h, /row: \{\s+flexDirection: 'row',\s+alignItems: 'center',\s+minHeight: 76,\s+paddingHorizontal: 16,/);
  assert.match(h, /ring: \{\s+width: 48,\s+height: 48,\s+borderRadius: radius\.tile,\s+borderCurve: 'continuous',\s+backgroundColor: colors\.wash,/);
  assert.doesNotMatch(h, /borderWidth/);
  const oc = src('features/event/open-chat-section.tsx');
  assert.match(oc, /<Card>\s+\{rooms\.map\(/);
  assert.match(oc, /minHeight: 76,/);
  assert.match(oc, /tile: \{\s+width: 48,\s+height: 48,\s+borderRadius: radius\.tile,/);
  assert.doesNotMatch(oc, /borderWidth/);
});
