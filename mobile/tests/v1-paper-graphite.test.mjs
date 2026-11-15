// Run: npm test. V1 Paper & Graphite tokens and primitives: docs/evidence/ux/paper-graphite-spec-2026-11-14.md.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const ui = src('components/ui.tsx');
const hand = src('components/hand-title.tsx');

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('B1 palette (light only): ivory paper, wash, wash2, lift, redwash; old keys hold the new tones', () => {
  assert.match(ui, /paper: '#FFFCF8',\s*wash: '#F5EFE7',\s*wash2: '#E6DED7',\s*lift: '#FFFFFF',\s*redwash: '#FBE9E7',\s*card: '#F5EFE7',\s*cardStrong: '#E6DED7',\s*dangerCard: '#FBE9E7',/);
  assert.doesNotMatch(ui, /dark: \{/);
  assert.match(ui, /tint: '#990000'/);
  for (const k of ['wash', 'wash2', 'lift', 'redwash']) assert.match(ui, new RegExp(`  ${k}: themed\\('${k}'\\),`));
});

test('V1 contrast (spec Accessibility): ink and ink2 on wash, errorText on redwash', () => {
  assert.ok(ratio('#302B28', '#F5EFE7') >= 10);
  assert.ok(ratio('#71645E', '#F5EFE7') >= 4.5);
  assert.ok(ratio('#71645E', '#FFFCF8') >= 4.5);
  assert.ok(ratio('#D70015', '#FBE9E7') >= 4.5);
});

test('B1 lift shadow: one warm layer, light only', () => {
  assert.match(ui, /light: \{ boxShadow: '0 2px 8px rgba\(48,43,40,0\.08\)' \}/);
});

test('V1 Button: pills, 17 pt semibold, no outline; B2 secondary lift with a 1.5 pt tint border (wash pressed), destructive redwash', () => {
  assert.match(ui, /quiet && \{ borderWidth: 1\.5, borderColor: colors\.tint \}/);
  assert.match(ui, /buttonText: \{ fontSize: 17, fontWeight: '600' \}/);
  assert.match(ui, /minHeight: 52,\s*borderRadius: radius\.pill,/);
  assert.match(ui, /secondary: colors\.lift,\s*destructive: colors\.redwash,/);
  assert.match(ui, /destructive: colors\.errorText,/);
  assert.match(ui, /secondary: colors\.tint,\s*destructive: colors\.errorText/);
  assert.match(ui, /quiet && pressed && !disabled \? colors\.wash : fill/);
});

test('V1 Card and Tag primitives, gutter 20, radii', () => {
  assert.match(ui, /card: \{ backgroundColor: colors\.lift, borderRadius: radius\.card, borderCurve: 'continuous' \}/);
  assert.match(ui, /cardDivider: \{ height: 1, marginHorizontal: 16, backgroundColor: colors\.separator \}/);
  assert.match(ui, /export function Tag\(/);
  assert.match(ui, /backgroundColor: colors\.softGold,\s*borderRadius: radius\.tag,\s*borderCurve: 'continuous',\s*paddingVertical: 3,\s*paddingHorizontal: 8,/);
  assert.match(ui, /tagText: \{ fontSize: 12, fontWeight: '600', color: colors\.label \}/);
  assert.match(ui, /radius = \{ pill: 999, card: 24, tile: 16, tag: 999, field: 16 \}/);
  assert.match(ui, /gutter: 20,/);
});

test('B1 HandTitle: Source Sans 3 titles, 28/36 screen and 20/28 sheet, no squiggle, no handwriting font', () => {
  assert.match(ui, /titleSize = \{ screen: 28, sheet: 20 \} as const/);
  assert.match(hand, /title: \{ fontSize: titleSize\.sheet, lineHeight: 28, fontWeight: '600' \}/);
  assert.match(hand, /screen: \{ fontSize: titleSize\.screen, lineHeight: 36 \}/);
  assert.match(hand, /maxFontSizeMultiplier=\{screen \? 1\.2 : 1\.6\}/);
  assert.doesNotMatch(hand, /Svg|PENCIL_UNDERLINE|PatrickHand|Gaegu/);
  for (const p of ['app/index.tsx', 'app/profile.tsx', 'features/calendar/calendar-screen.tsx']) assert.doesNotMatch(src(p), /titleUnderline/);
  const text = src('components/text.tsx');
  assert.match(text, /SourceSans3-Regular/);
  assert.match(text, /SourceSans3-Semibold/);
  assert.match(text, /SourceSans3-Bold/);
});

test('V1 QRowCard: standalone wash fill with no border; grouped drops its own fill and radius inside a Card', () => {
  const row = readFileSync(new URL('../src/components/q-row-card.tsx', import.meta.url), 'utf8');
  assert.match(row, /backgroundColor: colors\.wash,/);
  assert.doesNotMatch(row, /borderWidth|backgroundColor: colors\.field/);
  assert.match(row, /grouped\?: boolean;/);
  assert.match(row, /grouped: \{ backgroundColor: 'transparent', borderRadius: 0 \}/);
  assert.match(row, /<View style=\{\[styles\.card, grouped && styles\.grouped\]\} accessible/);
  assert.match(row, /\[styles\.card, grouped && styles\.grouped, pressed && \{ opacity: 0\.6 \}\]/);
});

test('B2 fields: wash fill, radius 16, 52 pt; a 2 pt Cardinal ring only while focused (as the join-code box)', () => {
  const q = src('components/q-screen.tsx');
  assert.match(q, /field: \{\s*minHeight: 52,\s*borderWidth: 2,\s*borderColor: 'transparent',\s*borderRadius: 16,/);
  assert.match(q, /color: colors\.label,\s*backgroundColor: colors\.wash,\s*\}/);
  assert.match(q, /fieldFocused: \{ borderColor: colors\.tint \}/);
  assert.match(q, /fieldOnSheet: \{ backgroundColor: colors\.sheetField \}/);
  assert.match(q, /focused && styles\.fieldFocused/);
  // The caller's onFocus/onBlur still run.
  assert.match(q, /setFocused\(true\);\s*onFocus\?\.\(e\);/);
  assert.match(q, /setFocused\(false\);\s*onBlur\?\.\(e\);/);
  assert.doesNotMatch(q, /borderWidth: StyleSheet\.hairlineWidth \* 2,\s*borderColor: colors\.separator,\s*borderRadius: 12,\s*borderCurve: 'continuous',\s*paddingHorizontal: 14,\s*fontSize: 17/);
  const create = src('app/create-room.tsx');
  assert.match(create, /fieldRow: \{[^}]*backgroundColor: colors\.field,\s*borderWidth: 1\.5,\s*borderColor: 'transparent',\s*borderRadius: 12,/);
  assert.match(create, /fieldRowFocused: \{ borderColor: colors\.tint \}/);
  assert.match(create, /styles\.fieldRow, focusedRow === 'area' && styles\.fieldRowFocused/);
  assert.match(create, /styles\.fieldRow, focusedRow === 'place' && styles\.fieldRowFocused/);
  // Outlined switch rows and the Status options box stay for V5.
  assert.match(create, /row: \{ \.\.\.outline,/);
  assert.match(src('components/join-code-screen.tsx'), /borderWidth: 1\.5,\s*borderColor: 'transparent',/);
});
