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
  assert.match(src("app/profile.tsx"), /subtitle=\{isGuest \? en\.profile\.guestAccount : undefined\}/);
});

test('UX3-A05: labels sit above the fields on Log in, Create account, Guest and Create room', () => {
  const q = src('components/q-screen.tsx');
  assert.match(q, /placeholder=\{labelAbove \? undefined : label\}/);
  assert.match(q, /secureTextEntry=\{secureTextEntry && !shown\}/);
  assert.match(q, /fieldLabel: \{ fontSize: 13, fontWeight: '600', color: colors\.ink2 \}/);
  assert.match(q, /fieldBlock: \{ gap: 6 \}/);
  const form = src('components/host-account-form.tsx');
  assert.equal(form.match(/labelAbove/g)?.length, 3);
  assert.match(form, /helper=\{isNew \? en\.fields\.passwordHelper : undefined\}/);
  assert.match(form, /placeholder=\{en\.fields\.emailExample\}/);
  assert.match(src('app/guest.tsx'), /labelAbove/);
  assert.match(src('app/create-room.tsx'), /labelAbove\n\s+placeholder=\{en\.createRoom\.namePlaceholder\}/);
});

test('UX3-A10: the code goes on after the 5th digit; a wrong code shakes, buzzes once and shows the red line', () => {
  const j = src('components/join-code-screen.tsx');
  assert.match(j, /next\.length === CODE_LENGTH && next !== code\) void submit\(next\)/);
  assert.doesNotMatch(j, /en\.join\.submit|qrNote|QCard|InkArt/);
  assert.equal(j.match(/errorHaptic\(\)/g)?.length, 2, 'one definition, one call');
  assert.match(j, /if \(reduceMotion !== false\) return;/);
  assert.match(j, /e\.kind === 'invalid'/);
  assert.match(j, /error: \{ fontSize: 15, color: colors\.errorText \}/);
  const h = src('lib/join-code.ts');
  const steps = [...h.matchAll(/\{ x: (-?\d+), ms: (\d+) \}/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.equal(steps.reduce((t, [, ms]) => t + ms, 0), 300);
  assert.equal(Math.max(...steps.map(([x]) => Math.abs(x))), 6);
  assert.equal(steps.at(-1)[0], 0);
  assert.match(src('i18n/en.ts'), /noRoom: 'No room with that code\. Check with your host\.'/);
});

test('UX3-A07 (ux): the Profile Account row shows the email or "Guest on this phone", never Host', () => {
  const p = src('app/profile.tsx');
  assert.match(p, /const accountValue = isGuest \? en\.profile\.guestAccount : session\?\.user\.email;/);
  assert.match(p, /value=\{accountValue\}\n\s+valueTruncate/);
  assert.match(p, /`\$\{en\.profile\.account\}, \$\{accountValue\}`/);
  assert.doesNotMatch(p, /en\.profile\.host\b/);
  const r = src('components/q-row-card.tsx');
  assert.match(r, /ellipsizeMode=\{valueTruncate \? 'middle' : undefined\}/);
  assert.match(r, /valueTruncate: \{ fontSize: 15/);
});
