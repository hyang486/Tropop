// Run: npm test. Plus intro: /plan-preview?from= picks the headline and the first, marked benefit.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const p = await import('../src/features/calendar/plus-intro.ts');
const { en } = await import('../src/i18n/en.ts');

test('from: known values pass, anything else is more', () => {
  for (const f of ['calendar', 'room-ai', 'more', 'diary']) assert.equal(p.plusFrom(f), f);
  for (const f of [undefined, '', 'Calendar', 'x', 3, null]) assert.equal(p.plusFrom(f), 'more');
  assert.equal(p.plusFrom(['diary', 'more']), 'diary');
});

test('benefits: the matching one first and the only one marked, none lost', () => {
  const want = { calendar: 'add', diary: 'diary', 'room-ai': 'ai', more: 'rooms' };
  for (const [from, key] of Object.entries(want)) {
    const list = p.plusBenefits(from);
    assert.deepEqual(list[0], { key, focus: true });
    assert.equal(list.filter((b) => b.focus).length, 1);
    assert.deepEqual([...list.map((b) => b.key)].sort(), [...p.PLUS_BENEFITS].sort());
  }
});

test('copy: a headline per source, a title and line per benefit, no TBD on the first screen', () => {
  const t = en.planPreview;
  for (const f of p.PLUS_FROM) assert.ok(t.headline[f], f);
  for (const k of p.PLUS_BENEFITS) assert.ok(t.benefits[k].title && t.benefits[k].body, k);
  const first = JSON.stringify([t.headline, t.sub, t.benefits, t.intro]);
  assert.doesNotMatch(first, /TBD/);
});

test('screen reads from, uses the Qrew scaffold and the ink switch', () => {
  const s = readFileSync(new URL('../src/app/plan-preview.tsx', import.meta.url), 'utf8');
  assert.match(s, /plusFrom\(useLocalSearchParams/);
  assert.match(s, /<QScreen/);
  assert.match(s, /<InkSwitch/);
  assert.doesNotMatch(s, /from 'react-native';[\s\S]*\bSwitch\b,/);
});

test('Add with Qrewing tap: Plus asks, Free goes to the intro, unread shows no button', () => {
  assert.equal(p.addTapAction(true), 'ask');
  assert.equal(p.addTapAction(false), 'intro');
  assert.equal(p.addTapAction(null), null);
  assert.equal(p.plusIntroHref('calendar'), '/plan-preview?from=calendar');
});
