import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-59: the inline title is Patrick Hand 20, one line, set as the native header title and faded by scroll', () => {
  const h = src('components/inline-header-title.tsx');
  assert.match(h, /title: \{ fontSize: 20, lineHeight: 26 \}/);
  assert.match(h, /<HandTitle style=\{styles\.title\} numberOfLines=\{1\}>/);
  assert.match(h, /navigation\.setOptions\(\{ headerTitle: \(\) => <InlineTitle text=\{title\} shown=\{shown\} \/> \}\)/);
  assert.match(h, /setShown\(bottom != null && y \+ overlap >= bottom\)/);
  assert.match(h, /accessibilityElementsHidden=\{!shown\}/);
});

test('UX2-59: QScreen wires it under a header (sheets opt in) and fades solid to the header bottom', () => {
  const q = src('components/q-screen.tsx');
  assert.match(q, /useInlineHeaderTitle\(title && \(inlineTitle \?\? !sheet\) && overlap > 0 \? title : null, overlap\)/);
  assert.match(q, /<View style=\{styles\.head\} onLayout=\{inline\.onTitleLayout\}>/);
  assert.match(q, /inline\.onScrollY\(e\.nativeEvent\.contentOffset\.y\)/);
  assert.match(q, /height: overlap \+ 16, backgroundImage: `linear-gradient\(\$\{paper\} 0%, \$\{paper\} \$\{edgeSolid\(overlap\)\}%/);
  const ed = src('features/calendar/event-editor.tsx');
  assert.equal((ed.match(/<QScreen\s+sheet\s+inlineTitle\b/g) ?? []).length, 2);
  // A screen's own headerTitle: '' would override the inline title on its next render.
  for (const p of ['features/calendar/event-editor.tsx', 'app/room/[id]/map.tsx', 'app/profile.tsx', 'app/profile-edit.tsx', 'features/calendar/calendar-screen.tsx', 'app/room/[id]/info.tsx', 'components/join-code-screen.tsx']) {
    assert.doesNotMatch(src(p), /headerTitle: ''/, p);
  }
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /useInlineHeaderTitle\(en\.map\.title, useHeaderHeight\(\)\)/);
  assert.match(map, /<View style=\{styles\.head\} onLayout=\{inlineTitle\.onTitleLayout\}>/);
});
