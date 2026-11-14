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
  // C25 (Room info FAIL): the trigger is the title's own bottom (block y + title y + height), not the block's,
  // so a subtitle ("Room info · Host") or Map's room name under the title never delays it.
  assert.match(h, /blockY\.current \+ \(textBottom\.current \?\? blockH\.current\)/);
  assert.match(h, /blockY\.current = e\.nativeEvent\.layout\.y;/);
  assert.match(h, /textBottom\.current = e\.nativeEvent\.layout\.y \+ e\.nativeEvent\.layout\.height;/);
  assert.match(h, /accessibilityElementsHidden=\{!shown\}/);
});

test('UX2-59: QScreen wires it under a header (sheets opt in) and fades solid to the header bottom', () => {
  const q = src('components/q-screen.tsx');
  assert.match(q, /useInlineHeaderTitle\(title && \(inlineTitle \?\? !sheet\) && overlap > 0 \? title : null, overlap\)/);
  // C28: the whole block (title + subtitle) carries the scroll-driven fade.
  assert.match(q, /<Animated\.View style=\{\[styles\.head, \{ opacity: inline\.blockOpacity \}\]\} onLayout=\{inline\.onTitleLayout\}>\s*<View onLayout=\{inline\.onTitleTextLayout\}>\s*<HandTitle>\{title\}<\/HandTitle>\s*<\/View>\s*\{subtitle \? <Text style=\{styles\.subtitle\}>\{subtitle\}<\/Text> : null\}\s*<\/Animated\.View>/);
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
  // Map passed ux C25 as is: no title measure, so it keeps the block's bottom.
  assert.match(map, /<View style=\{styles\.head\} onLayout=\{inlineTitle\.onTitleLayout\}>/);
  assert.doesNotMatch(map, /onTitleTextLayout|blockOpacity/);
});

test('UX2-59 C28: the title block fades 1 → 0 over the 24 pt before its bottom meets the header, from the scroll value', () => {
  const h = src('components/inline-header-title.tsx');
  const m = h.match(/export function titleBlockOpacity\(blockBottom: number, y: number, overlap: number\) \{\n  return (.+);\n\}/);
  assert.ok(m, 'titleBlockOpacity');
  assert.match(h, /const BLOCK_FADE_PT = 24;/);
  const f = new Function('blockBottom', 'y', 'overlap', 'BLOCK_FADE_PT', `return ${m[1]};`);
  const at = (y) => f(200, y, 100, 24); // block bottom 200 in content, header bottom 100
  assert.equal(at(0), 1);
  assert.equal(at(76), 1); // 24 pt before: still solid
  assert.equal(at(88), 0.5);
  assert.equal(at(100), 0); // the subtitle's bottom reaches the header's bottom
  assert.equal(at(300), 0);
  assert.equal(at(-50), 1); // pull-to-refresh overscroll
  // Same update as the inline-title trigger; off (sheet, no header) keeps the block solid. No Reduce Motion branch.
  assert.match(h, /setShown\(bottom != null && y \+ overlap >= bottom\);\n[^\n]*\n\s*blockOpacity\.setValue\(on && blockY\.current != null \? titleBlockOpacity\(blockY\.current \+ blockH\.current, y, overlap\) : 1\)/);
});
