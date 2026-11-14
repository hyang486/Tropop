// Run: npm test. UX3 batch 1 (audit-3 part 1): source checks for the screens this batch changes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX3-A03: Welcome shows art, the headline and three value rows, no tagline', () => {
  const w = src('app/welcome.tsx');
  const en = src('i18n/en.ts');
  assert.match(en, /headline: "One room for today's crew"/);
  for (const k of ['valueJoin', 'valuePhotos', 'valueGone']) {
    assert.match(w, new RegExp(`en\\.welcome\\.${k}Title`));
    assert.match(w, new RegExp(`en\\.welcome\\.${k}Line`));
  }
  assert.match(w, /<InkArt art="gathering" width=\{300\} \/>/);
  assert.doesNotMatch(w, /tagline/);
  assert.doesNotMatch(en, /tagline:/);
});

test('UX3-A07: account wording is only Log in and Create account', () => {
  const en = src('i18n/en.ts');
  for (const old of ['I have an account', 'Host login', 'Host log in', 'Become a host', "'Sign up'", 'Create host account', 'Create a host account', 'New here?', 'Create an account to host rooms', "'Host account'"]) {
    assert.ok(!en.includes(old), old);
  }
  assert.match(en, /loginTitle: 'Log in',\n\s+loginSubtitle: 'Welcome back.'/);
  assert.match(en, /upgradeSubtitle: 'Keep your rooms and start hosting your own.'/);
  assert.match(en, /guestAccount: 'Guest on this phone'/);
  assert.match(src('components/host-account-form.tsx'), /mode === 'upgrade' \? en\.hostAccount\.upgradeSubtitle/);
  assert.match(src('app/profile.tsx'), /isGuest \? en\.profile\.guestAccount : \(session\?\.user\.email \?\? undefined\)/);
});
