import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

// UX2-46: every custom sheet closes at once (animationType 'none') when a link or notification tap navigates.
const WIRED = {
  'features/pace/pace-card.tsx': 1,
  'app/plan-preview.tsx': 1,
  'components/route-editor.tsx': 1,
  'features/calendar/calendar-screen.tsx': 2,
  'components/calendar/day-items-sheet.tsx': 1,
  'components/calendar/plus-upsell-card.tsx': 1,
};

test('UX2-46: pace goal, plan, route editor and calendar sheets subscribe to dismissSheets and close without animation', () => {
  for (const [p, n] of Object.entries(WIRED)) {
    const s = src(p);
    assert.equal((s.match(/= useDismissOnLink\(/g) ?? []).length, n, p);
    assert.equal((s.match(/animationType=\{\w*[iI]nstant \? 'none'/g) ?? []).length, n, p);
  }
  assert.match(src('components/route-editor.tsx'), /useDismissOnLink\(onCancel\)/);
});
