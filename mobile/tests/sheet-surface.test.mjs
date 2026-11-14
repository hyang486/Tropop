import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const SHEETS = [
  'features/chat/chat-sheet.tsx',
  'features/pace/pace-card.tsx',
  'features/questions/answer-sheet.tsx',
  'components/status-picker.tsx',
  'components/add-media-sheet.tsx',
  'components/maps-sheet.tsx',
];

test('UX2-45: sheet, scrim and grabber tokens, light and dark', () => {
  const ui = src('components/ui.tsx');
  assert.match(ui, /sheet: '#FFFFFF',\s*scrim: 'rgba\(0,0,0,0\.25\)',\s*grabber: 'rgba\(94,94,88,0\.4\)'/);
  assert.match(ui, /sheet: '#1C1C1E',\s*scrim: 'rgba\(0,0,0,0\.5\)',\s*grabber: 'rgba\(168,168,162,0\.4\)'/);
  assert.match(ui, /sheet: themed\('sheet'\),\s*scrim: themed\('scrim'\),\s*grabber: themed\('grabber'\)/);
});

test('UX2-45: every custom bottom sheet uses the sheet surface, the scrim, a 16 pt radius and the 36×5 grabber', () => {
  for (const p of SHEETS) {
    const s = src(p);
    assert.match(s, /backgroundColor: colors\.scrim/, p);
    assert.match(s, /backgroundColor: colors\.sheet,\s*borderTopLeftRadius: 16,\s*borderTopRightRadius: 16,/, p);
    assert.match(s, /width: 36, height: 5, borderRadius: 2\.5, backgroundColor: colors\.grabber/, p);
    assert.doesNotMatch(s, /rgba\(0,0,0,0\.25\)|borderTopLeftRadius: 24/, p);
    // Cards, rows and tiles inside a sheet are cardStrong (card would match the dark sheet).
    assert.doesNotMatch(s, /backgroundColor: colors\.field,/, p);
  }
  assert.match(src('features/questions/answer-sheet.tsx'), /<AnsweredCard [^>]*onSheet \/>/);
  assert.match(src('features/questions/relayed-cards.tsx'), /botOnSheet: \{ backgroundColor: colors\.fieldStrong \}/);
});

test('UX2-48: pageSheets use the sheet ground with sheetField cards and bubbles', () => {
  const ui = src('components/ui.tsx');
  assert.match(ui, /grabber: 'rgba\(94,94,88,0\.4\)',\s*sheetCard: '#F6F6F2'/);
  assert.match(ui, /grabber: 'rgba\(168,168,162,0\.4\)',\s*sheetCard: '#2C2C2E'/);
  assert.match(ui, /sheetField: themed\('sheetCard'\)/);
  const q = src('components/q-screen.tsx');
  assert.match(q, /<OnSheet value=\{!!sheet\}>/);
  assert.match(q, /cardOnSheet: \{ backgroundColor: colors\.sheetField \}/);
  for (const p of ['features/event/ask-screen.tsx', 'features/questions/questions-screen.tsx']) {
    assert.match(src(p), /<QScreen\s+sheet\b/, p);
  }
  assert.equal((src('app/room/[id]/invite.tsx').match(/<QScreen\s+sheet\b/g) ?? []).length, 2);
  assert.match(src('components/host-account-form.tsx'), /sheet=\{mode === 'upgrade'\}/);
  assert.match(src('features/event/disclosure-sheet.tsx'), /root: \{ flex: 1, backgroundColor: colors\.sheet \}/);
  const plan = src('app/plan-preview.tsx');
  assert.match(plan, /sheet: \{ flex: 1, backgroundColor: colors\.sheet,/);
  assert.match(plan, /compare: \{[^}]*backgroundColor: colors\.sheetField/);
  assert.match(src('features/event/ask-screen.tsx'), /bot: \{[^}]*backgroundColor: colors\.sheetField/);
  assert.match(src('features/questions/relayed-cards.tsx'), /bot: \{[^}]*backgroundColor: colors\.sheetField/);
});

test('UX2-48 follow-up (C20): Ask composer, calendar sheets and the event editor use the sheet surfaces', () => {
  const c = src('components/composer.tsx');
  assert.match(c, /fieldOnSheet: \{ backgroundColor: colors\.sheetField \}/);
  assert.match(c, /styles\.field, onSheet && styles\.fieldOnSheet/);
  assert.match(src('components/calendar/day-items-sheet.tsx'), /styles\.sheet, \{ backgroundColor: colors\.sheet \}/);
  assert.match(src('features/calendar/calendar-screen.tsx'), /sheet: \{ flex: 1, padding: 24, gap: 12, backgroundColor: colors\.sheet \}/);
  assert.equal((src('features/calendar/event-editor.tsx').match(/<QScreen\s+sheet\b/g) ?? []).length, 2);
});
