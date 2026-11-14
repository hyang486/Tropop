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
  assert.match(src('components/q-row-card.tsx'), /\) : onPress && !action \? \(/);
  assert.match(src('i18n/en.ts'), /guestAccessBody: 'Guest profile on this phone',/);
});
