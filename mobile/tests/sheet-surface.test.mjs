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
