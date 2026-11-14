// Run: npm test. Plus intro: /plan-preview?from= picks the headline and the first, marked benefit.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const p = await import('../src/features/calendar/plus-intro.ts');
const { en } = await import('../src/i18n/en.ts');

test('from: known values pass, anything else is none (no reason card)', () => {
  for (const f of ['calendar', 'room-ai', 'more', 'people', 'diary']) assert.equal(p.plusFrom(f), f);
  for (const f of [undefined, '', 'Calendar', 'x', 3, null]) assert.equal(p.plusFrom(f), null);
  assert.equal(p.plusFrom(['diary', 'more']), 'diary');
});

test('benefits: the matching ones first and marked, none lost; no from keeps the default order', () => {
  const want = { calendar: ['diary', 'add'], diary: ['diary'], 'room-ai': ['ai'], more: ['days'], people: ['people'] };
  for (const [from, keys] of Object.entries(want)) {
    const list = p.plusBenefits(from);
    assert.deepEqual(list.slice(0, keys.length), keys.map((key) => ({ key, focus: true })));
    assert.equal(list.filter((b) => b.focus).length, keys.length);
    assert.deepEqual([...list.map((b) => b.key)].sort(), [...p.PLUS_BENEFITS].sort());
  }
  assert.deepEqual(p.plusBenefits(null).map((b) => b.key), [...p.PLUS_BENEFITS]);
  assert.ok(p.plusBenefits(null).every((b) => !b.focus));
});

test('copy: a reason card per source, a title and line per benefit, limits match the plan code', () => {
  const t = en.planPreview;
  for (const f of p.PLUS_FROM) assert.ok(t.reason[f].tag && t.reason[f].parts.join('').length > 0, f);
  for (const k of p.PLUS_BENEFITS) assert.ok(t.benefits[k].title && t.benefits[k].body, k);
  for (const n of t.now) assert.ok(p.PLUS_BENEFITS.includes(n.key), n.key);
  assert.doesNotMatch(JSON.stringify([t.heading, t.sub, t.reason, t.benefits]), /TBD/);
  assert.deepEqual(t.compare.slice(0, 2).map((r) => [r.free, r.plus]), [['6', '30'], ['2 days', '7 days']]);
  assert.equal(t.tbdNote, 'Prices are not decided yet.');
  assert.doesNotMatch(JSON.stringify(t), /\$|price:|Get Plus/);
});

test('screen reads from, uses the Qrew scaffold, no purchase; the preview toggle is a button', () => {
  const s = readFileSync(new URL('../src/app/plan-preview.tsx', import.meta.url), 'utf8');
  assert.match(s, /plusFrom\(useLocalSearchParams/);
  assert.match(s, /<QScreen actions=\{actions\}/);
  assert.match(s, /title=\{t\.tryCta\}[^\n]*onPress=\{\(\) => void toggle\(true\)\}/);
  assert.match(s, /title=\{t\.offCta\}[^\n]*onPress=\{\(\) => void toggle\(false\)\}/);
  assert.match(s, /plusBenefits\(from\)/);
  assert.doesNotMatch(s, /from '[^']*(iap|in-app|purchase|storekit)[^']*'/i);
});

test('Add with Qrewing tap: Plus asks, Free goes to the intro, unread shows no button', () => {
  assert.equal(p.addTapAction(true), 'ask');
  assert.equal(p.addTapAction(false), 'intro');
  assert.equal(p.addTapAction(null), null);
  assert.equal(p.plusIntroHref('calendar'), '/plan-preview?from=calendar');
});
