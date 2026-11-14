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

test('V1 palette: paper, wash, wash2, lift, redwash in light and dark; old keys hold the new tones', () => {
  assert.match(ui, /paper: '#F7F6F2',\s*wash: '#EDECE6',\s*wash2: '#E3E2DB',\s*lift: '#FFFFFF',\s*redwash: '#FBE9E7',\s*card: '#EDECE6',\s*cardStrong: '#E3E2DB',\s*dangerCard: '#FBE9E7',/);
  assert.match(ui, /paper: '#121211',\s*wash: '#1F1F1D',\s*wash2: '#2A2A27',\s*lift: '#232321',\s*redwash: '#3A1A1A',\s*card: '#1F1F1D',\s*cardStrong: '#2A2A27',/);
  assert.match(ui, /sheet: '#232321',/);
  for (const k of ['wash', 'wash2', 'lift', 'redwash']) assert.match(ui, new RegExp(`  ${k}: themed\\('${k}'\\),`));
});

test('V1 contrast (spec Accessibility): ink and ink2 on wash, errorText on redwash', () => {
  assert.ok(ratio('#181817', '#EDECE6') >= 14);
  assert.ok(ratio('#5E5E58', '#EDECE6') >= 5.5);
  assert.ok(ratio('#5E5E58', '#F7F6F2') >= 6);
  assert.ok(ratio('#D70015', '#FBE9E7') >= 4.5);
  assert.ok(ratio('#EDEDE8', '#1F1F1D') >= 14);
  assert.ok(ratio('#A8A8A2', '#1F1F1D') >= 4.5);
  assert.ok(ratio('#FF6961', '#3A1A1A') >= 4.5);
});

test('V1 lift shadow: two layers on light, a 6% hairline on dark', () => {
  assert.match(ui, /light: \{ boxShadow: '0 1px 2px rgba\(24,24,23,0\.06\), 0 8px 24px rgba\(24,24,23,0\.08\)' \}/);
  assert.match(ui, /dark: \{ borderWidth: StyleSheet\.hairlineWidth, borderColor: 'rgba\(255,255,255,0\.06\)' \}/);
});

test('V1 Button: pills, 17 pt semibold, no outline; secondary wash (wash2 pressed), destructive redwash', () => {
  assert.doesNotMatch(ui, /outlined|borderWidth: 1\.5/);
  assert.match(ui, /buttonText: \{ fontSize: 17, fontWeight: '600' \}/);
  assert.match(ui, /minHeight: 52,\s*borderRadius: radius\.pill,/);
  assert.match(ui, /secondary: colors\.wash,\s*destructive: colors\.redwash,/);
  assert.match(ui, /destructive: colors\.errorText,/);
  assert.match(ui, /quiet && pressed && !disabled \? colors\.wash2 : fill/);
});

test('V1 Card and Tag primitives, gutter 20, radii', () => {
  assert.match(ui, /card: \{ backgroundColor: colors\.lift, borderRadius: radius\.card, borderCurve: 'continuous' \}/);
  assert.match(ui, /cardDivider: \{ height: 1, marginHorizontal: 16, backgroundColor: colors\.wash \}/);
  assert.match(ui, /export function Tag\(/);
  assert.match(ui, /backgroundColor: colors\.wash,\s*borderRadius: radius\.tag,\s*borderCurve: 'continuous',\s*paddingVertical: 3,\s*paddingHorizontal: 8,/);
  assert.match(ui, /tagText: \{ fontSize: 12, fontWeight: '600', color: colors\.label \}/);
  assert.match(ui, /radius = \{ pill: 999, card: 22, tile: 14, tag: 10 \}/);
  assert.match(ui, /gutter: 20,/);
});

test('V1 HandTitle: 40/44 screen titles capped at 1.2, pencil underline on the three root screens only', () => {
  assert.match(ui, /titleSize = \{ screen: 40, sheet: 24 \}/);
  assert.match(hand, /screen: \{ fontSize: titleSize\.screen, lineHeight: 44 \}/);
  assert.match(hand, /maxFontSizeMultiplier=\{screen \? 1\.2 : 1\.6\}/);
  assert.match(hand, /'M2 6c10-4 18 3 28-1s18-3 28 0 20 2 36-2'/);
  assert.match(hand, /strokeWidth=\{2\} strokeLinecap="round"/);
  assert.match(hand, /underline: \{ marginTop: 4 \}/);
  assert.match(hand, /accessibilityElementsHidden/);
  for (const p of ['app/index.tsx', 'app/profile.tsx', 'features/calendar/calendar-screen.tsx']) assert.match(src(p), /titleUnderline/);
  // Plus stays as it is (human, FINAL).
  assert.doesNotMatch(src('app/plan-preview.tsx'), /titleUnderline|HandTitle screen/);
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
