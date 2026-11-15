// Run: npm test. Calendar tiers and interaction (human FINAL 2026-11-13 PM): Free gets the month, "+" and room
// bars; a room tap opens the diary on Plus and the upsell on Free; "Add with Trok" is Plus only; no day list.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('../src/features/calendar/calendar-screen.tsx', import.meta.url), 'utf8');
const en = readFileSync(new URL('../src/i18n/en.ts', import.meta.url), 'utf8');

test('no Plus gate on the screen: signed in is enough', () => {
  assert.match(screen, /calendarGate\(!!uid\) === 'signedOut'/);
  assert.doesNotMatch(screen, /upsellTitle|upsellCta/);
});

test('"Add with Trok": Plus opens the ask, Free goes to the Plus intro (from=calendar), hidden while unread', () => {
  assert.match(screen, /const options = ask === null \? \[t\.add, t\.addMenuCancel\] : \[t\.add, t\.ask, t\.addMenuCancel\];/);
  assert.match(screen, /else if \(i === 1 && ask === 'ask'\) setAsking\(true\);\s*else if \(i === 1 && ask\) router\.push\(plusIntroHref\('calendar'\)\);/);
  assert.match(screen, /if \(code === 'plan_limit'\) \{\s*close\(\);\s*router\.push\(plusIntroHref\('calendar'\)\)/);
  assert.doesNotMatch(screen, /'\/plan-preview'/);
});

test('calendar v2 §A: day cells are tap targets that open the day detail; the header row holds Add and the avatar', () => {
  assert.match(screen, /router\.push\(\{ pathname: '\/calendar-day', params: \{ date: key \} \}\)/);
  assert.match(screen, /onPress=\{\(\) => openDay\(key\)\}/);
  assert.match(screen, /accessibilityLabel=\{t\.dayCellLabel\(/);
  // §A1 (ux 2026-11-15): the tab nav bar holds Add (44 pt wash circle) then the avatar; no in-content header row.
  assert.match(screen, /headerRight: \(\) => \(\s*<View style=\{styles\.headerRow\}>\s*<Pressable accessibilityRole="button" accessibilityLabel=\{t\.addButton\} onPress=\{openAdd\} style=\{styles\.addBtn\}>[\s\S]*?<ProfileAvatarButton \/>/);
  assert.match(screen, /addBtn: \{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors\.wash/);
  assert.doesNotMatch(screen, /headerTitle|t\.wordmark/);
});

test('Plus intro: Calendar stays free; Trok diary and Add with Trok are Plus benefits', () => {
  assert.match(en, /alwaysFree: '[^']*your own calendar events/);
  // UX2-64: the diary left the shared benefit lines; it stays a Plus row in the Free vs Plus table.
  assert.match(en, /\{ label: 'Calendar diary', free: null, plus: true \}/);
  assert.match(en, /add: \['', 'Add with Trok', ': just say the plan'\]/);
});
