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

test('copy: a ≤2-line headline and one sub per preview, short lines, limits match the plan code, no reviews or undecided prices', () => {
  const t = en.planPreview;
  for (const pv of p.PLUS_PREVIEWS) {
    assert.ok(t.pitch[pv].heading.split('\n').length <= 2, pv);
    assert.ok(t.pitch[pv].sub && !t.pitch[pv].sub.includes('\n'), pv);
  }
  for (const k of p.PLUS_LINES) assert.ok(t.lines[k].join('').length <= 40, k);
  assert.equal(t.tryCta, 'Turn on Plus preview');
  assert.deepEqual(t.compare.slice(0, 2).map((r) => [r.free, r.plus]), [['6', '30'], ['2 days', '7 days']]);
  assert.equal(t.priceNote, 'Plus is $34.99/year ($2.92 a month) or $4.99/month.');
  assert.deepEqual(p.PLUS_LINES.map((k) => t.lines[k].join('')), [
    'Trok in every room you host',
    'Rooms up to 30 people and 7 days',
    'Add with Trok: just say the plan',
  ]);
  assert.equal(t.now, undefined);
  assert.doesNotMatch(JSON.stringify(t), /Get Plus|\bstars\b|\breviews?\b|not decided/i);
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

test('plus preview copy: price line, lead per source, 9 rows, Room Pass on host contexts only', () => {
  const t = en.planPreview;
  assert.equal(t.priceLine, '$34.99/year · $4.99/month');
  assert.equal(t.priceSub, 'Save 41% yearly. No payment in this preview.');
  // A guest (no account) and a member already on the preview see no price; a signed-in Free user does.
  assert.equal(p.showPrice(false, false), false);
  assert.equal(p.showPrice(true, true), false);
  assert.equal(p.showPrice(true, false), true);
  // An anonymous guest has a uid (signInAnonymously) but is not an account: no Room Pass either, even from a host context.
  assert.equal(p.showRoomPass('capacity', false), false);
  assert.equal(p.showRoomPass('capacity', true), true);
  // Room Pass footnote: host contexts only.
  for (const f of ['capacity', 'more', 'storage', 'people']) assert.equal(p.showRoomPass(f), true, f);
  for (const f of ['ask', 'calendar', 'diary', 'room-ai', 'pace', 'meet', null]) assert.equal(p.showRoomPass(f), false, String(f));
  assert.equal(t.roomPassNote.join(''), 'Just this room? Room Pass $2.99 gives it 30 people, 7 days and Trok.');
  // Lead line per source.
  assert.equal(t.lines[p.leadKey('ask')].join(''), 'Ask Trok in any room, even ones you don’t host');
  assert.equal(t.lines[p.leadKey('calendar')].join(''), 'Your diary: Trok writes a page after each room');
  for (const f of ['capacity', 'room-ai', null]) assert.equal(p.leadKey(f), 'ai');
  // 9 rows; the personal ones ("Just for you") start at row 5; Free shows null (rendered "—").
  assert.equal(t.compare.length, 9);
  assert.equal(t.compare[t.justForYouAt].label, 'Ask Trok, in any room');
  assert.equal(t.compare[2].label, 'Photo storage per room');
  assert.ok(t.compare.slice(3).every((r) => r.free === null && r.plus === true));
  assert.equal(t.justForYou, 'Just for you');
  const s = readFileSync(new URL('../src/app/plan-preview.tsx', import.meta.url), 'utf8');
  assert.match(s, /const account = !!uid && !isGuest;/);
  assert.match(s, /showPrice\(account, isPlus\)/);
  assert.match(s, /account \? <Text style=\{styles\.note\}>\{t\.priceNote\}/);
  assert.match(s, /roomPass=\{showRoomPass\(from, account\)\}/);
});
