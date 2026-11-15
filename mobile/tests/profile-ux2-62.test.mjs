import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-62: Profile has no bottom buttons; the name row opens Edit profile; Log out has no chevron', () => {
  const p = src('app/profile.tsx');
  assert.doesNotMatch(p, /actions=|<Button|en\.profile\.becomeHost/);
  assert.match(p, /accessibilityHint=\{en\.profile\.editProfile\}\s*onPress=\{editProfile\}/);
  assert.match(p, /onPress=\{confirmLogOut\}\s*action\b/);
  assert.match(p, /icon="person\.badge\.plus" title=\{en\.profile\.guestHostRow\}/);
  assert.match(src('components/q-row-card.tsx'), /onPress && !action \? \(/);
  // UX3-A07 (ux): the Account row's subtitle line is gone; the value says "Guest on this phone" or the email.
  assert.match(src('i18n/en.ts'), /guestAccount: 'Guest on this phone',/);
});

test('UX2-63: Edit profile shows a "Name" label above the name field, styled like "Or choose a picture"', () => {
  const p = src('app/profile-edit.tsx');
  assert.match(p, /<Text style=\{styles\.pickLabel\}[^>]*>\s*\{en\.profile\.nameHeading\}\s*<\/Text>\s*<QField/);
  assert.match(src('i18n/en.ts'), /nameHeading: 'Name',/);
});

test('UX2-139: Save name is disabled until the trimmed name differs from the saved name and is not empty', () => {
  const p = src('app/profile-edit.tsx');
  assert.match(p, /const trimmedName = name\.trim\(\);/);
  assert.match(p, /const nameChanged = trimmedName !== '' && trimmedName !== \(profile\?\.display_name \?\? ''\);/);
  assert.match(p, /onPress=\{save\} busy=\{busy === 'save'\} disabled=\{!nameChanged\} \/>/);
});
