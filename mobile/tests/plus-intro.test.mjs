// Run: npm test. Plus intro: /plan-preview?from= picks the headline and the first, marked benefit.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const p = await import('../src/features/calendar/plus-intro.ts');
const { en } = await import('../src/i18n/en.ts');

test('from: known values pass, anything else is none (no reason card)', () => {
  for (const f of ['calendar', 'room-ai', 'more', 'people', 'diary', 'capacity', 'ask', 'pace', 'meet', 'storage']) assert.equal(p.plusFrom(f), f);
  for (const f of [undefined, '', 'Calendar', 'x', 3, null]) assert.equal(p.plusFrom(f), null);
  assert.equal(p.plusFrom(['diary', 'more']), 'diary');
});

test('pitch: from picks the preview; the same three lines for every preview (UX2-64)', () => {
  const want = { calendar: 'diary', diary: 'diary', 'room-ai': 'chat', more: 'trip', people: 'trip', capacity: 'trip', ask: 'chat', pace: 'trip', meet: 'chat', storage: 'trip' };
  for (const [from, preview] of Object.entries(want)) assert.equal(p.plusPitch(from).preview, preview, from);
  assert.equal(p.plusPitch(null).preview, 'diary');
  for (const pv of p.PLUS_PREVIEWS) {
    const { lines } = p.plusPitch({ diary: 'diary', chat: 'room-ai', trip: 'more' }[pv]);
    assert.deepEqual([...lines], ['ai', 'rooms', 'add'], pv);
  }
});

test('copy: a ≤2-line headline and one sub per preview, short lines, limits match the plan code, no prices', () => {
  const t = en.planPreview;
  for (const pv of p.PLUS_PREVIEWS) {
    assert.ok(t.pitch[pv].heading.split('\n').length <= 2, pv);
    assert.ok(t.pitch[pv].sub && !t.pitch[pv].sub.includes('\n'), pv);
  }
  for (const k of p.PLUS_LINES) assert.ok(t.lines[k].join('').length <= 40, k);
  assert.equal(t.tryCta, 'Try Plus free');
  assert.deepEqual(t.compare.slice(0, 2).map((r) => [r.free, r.plus]), [['6', '30'], ['2 days', '7 days']]);
  assert.equal(t.tbdNote, 'Prices are not decided yet.');
  assert.deepEqual(p.PLUS_LINES.map((k) => t.lines[k].join('')), [
    'Trok in every room you host',
    'Rooms up to 30 people and 7 days',
    'Add with Trok: just say the plan',
  ]);
  assert.equal(t.now, undefined);
  assert.doesNotMatch(JSON.stringify(t), /\$\d|price:|Get Plus|\bstars\b|\breviews?\b/i);
});

test('screen: one CTA, the table only behind See what’s included, close button, no purchase', () => {
  const s = readFileSync(new URL('../src/app/plan-preview.tsx', import.meta.url), 'utf8');
  assert.match(s, /plusFrom\(useLocalSearchParams/);
  assert.match(s, /plusPitch\(from\)/);
  // UX2-64: the Plus list renders the same lines and icons as the Free list.
  assert.match(s, /PLUS_LINES\.map\(\(k\) => \(\s*<Line key=\{k\} icon=\{ICON\[k\]\} parts=\{t\.lines\[k\]\}/);
  // UX2-64: the Plus list renders the same lines and icons as the Free list.
  assert.match(s, /PLUS_LINES\.map\(\(k\) => \(\n\s*<Line key=\{k\} icon=\{ICON\[k\]\} parts=\{t\.lines\[k\]\}/);
  assert.match(s, /<QScreen actions=\{actions\}/);
  assert.match(s, /title=\{t\.tryCta\}[^\n]*onPress=\{\(\) => void toggle\(true\)\}/);
  assert.match(s, /title=\{t\.offCta\}[^\n]*onPress=\{\(\) => void toggle\(false\)\}/);
  assert.match(s, /onPress=\{\(\) => setSheet\(true\)\}/);
  assert.match(s, /presentationStyle="pageSheet"/);
  // The compare table renders only inside IncludedSheet.
  assert.ok(s.indexOf('t.compare.map') > s.indexOf('function IncludedSheet'));
  assert.match(s, /accessibilityLabel=\{t\.close\}/);
  assert.doesNotMatch(s, /from '[^']*(iap|in-app|purchase|storekit)[^']*'/i);
});

test('Add with Trok tap: Plus asks, Free goes to the intro, unread shows no button', () => {
  assert.equal(p.addTapAction(true), 'ask');
  assert.equal(p.addTapAction(false), 'intro');
  assert.equal(p.addTapAction(null), null);
  assert.equal(p.plusIntroHref('calendar'), '/plan-preview?from=calendar');
});
