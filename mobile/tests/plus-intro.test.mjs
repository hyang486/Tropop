// Run: npm test. Plus intro: /plan-preview?from= picks the headline and the first, marked benefit.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const p = await import('../src/features/calendar/plus-intro.ts');
const { en } = await import('../src/i18n/en.ts');

test('from: known values pass, anything else is none (no reason card)', () => {
  for (const f of ['calendar', 'room-ai', 'more', 'people', 'diary', 'capacity', 'ask', 'pace', 'meet']) assert.equal(p.plusFrom(f), f);
  for (const f of [undefined, '', 'Calendar', 'x', 3, null]) assert.equal(p.plusFrom(f), null);
  assert.equal(p.plusFrom(['diary', 'more']), 'diary');
});

test('pitch: from picks the preview; three lines, none repeating the preview', () => {
  const want = { calendar: 'diary', diary: 'diary', 'room-ai': 'chat', more: 'trip', people: 'trip', capacity: 'trip', ask: 'chat', pace: 'trip', meet: 'chat' };
  for (const [from, preview] of Object.entries(want)) assert.equal(p.plusPitch(from).preview, preview, from);
  assert.equal(p.plusPitch(null).preview, 'diary');
  const shown = { diary: ['diary'], chat: ['ai', 'recap'], trip: ['rooms'] };
  for (const pv of p.PLUS_PREVIEWS) {
    const { lines } = p.plusPitch({ diary: 'diary', chat: 'room-ai', trip: 'more' }[pv]);
    assert.equal(lines.length, 3, pv);
    assert.equal(new Set(lines).size, 3, pv);
    for (const l of lines) assert.ok(p.PLUS_LINES.includes(l), l);
    for (const l of shown[pv]) if (!(pv === 'chat' && l === 'recap')) assert.ok(!lines.includes(l), `${pv} repeats ${l}`);
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
  for (const n of t.now) assert.ok(p.PLUS_LINES.includes(n.key), n.key);
  assert.doesNotMatch(JSON.stringify(t), /\$\d|price:|Get Plus|\bstars\b|\breviews?\b/i);
});

test('screen: one CTA, the table only behind See what’s included, close button, no purchase', () => {
  const s = readFileSync(new URL('../src/app/plan-preview.tsx', import.meta.url), 'utf8');
  assert.match(s, /plusFrom\(useLocalSearchParams/);
  assert.match(s, /plusPitch\(from\)/);
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

test('Add with Qrewing tap: Plus asks, Free goes to the intro, unread shows no button', () => {
  assert.equal(p.addTapAction(true), 'ask');
  assert.equal(p.addTapAction(false), 'intro');
  assert.equal(p.addTapAction(null), null);
  assert.equal(p.plusIntroHref('calendar'), '/plan-preview?from=calendar');
});
