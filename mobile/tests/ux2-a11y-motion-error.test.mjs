// Run: npm test. UX2 a11y (ux decisions 1, 2, 4b): Reduce Motion fades my sheets, the pace number keeps 0.85,
// and fixable error text uses the accessible errorText red while Emergency/destructive keep systemRed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('Reduce Motion: the pace target sheet and answer sheet fade, from the live setting', () => {
  for (const p of ['features/pace/pace-card.tsx', 'features/questions/answer-sheet.tsx']) {
    const s = src(p);
    assert.match(s, /import \{ useReduceMotion \} from '@\/components\/enter-view';/, p);
    assert.match(s, /const reduceMotion = useReduceMotion\(\);/, p);
    // UX2-46: a link-dismissed sheet may go 'none' first.
    assert.match(s, /animationType=\{(?:instant \? 'none' : )?reduceMotion \? 'fade' : 'slide'\}/, p);
    assert.doesNotMatch(s, /animationType="slide"/, p);
  }
  // The hook follows changes, not a one-time read.
  assert.match(src('components/enter-view.tsx'), /addEventListener\('reduceMotionChanged', setReduce\)/);
});

test('pace number shrinks to 0.85 at most', () => {
  assert.match(src('features/pace/pace-card.tsx'), /<Text style=\{textRole\.stat\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\}>/);
});

test('errorText: #D70015 (light only, B1), used by Hint tone="error"; danger is the solid red', () => {
  const ui = src('components/ui.tsx');
  assert.match(ui, /dangerCard: '#FBE9E7',\s*errorText: '#D70015',/);
  assert.match(ui, /errorText: themed\('errorText'\),/);
  assert.match(ui, /danger: themed\('dangerSolid'\),/);
  assert.match(ui, /tone === 'error' && \{ color: colors\.errorText \}/);
  assert.match(ui, /destructive: colors\.redwash,/);
  assert.match(ui, /destructive: colors\.errorText,/);
});
