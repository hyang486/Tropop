import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-143: HomeHeaderButton says "Back to rooms" signed in and plain "Back" signed out; same icon and action', () => {
  const b = src('components/home-header-button.tsx');
  assert.match(b, /const signedIn = !!useAuth\(\)\.session;/);
  assert.match(b, /accessibilityLabel=\{signedIn \? en\.room\.backToRooms : en\.qrewing\.people\.back\}/);
  assert.match(b, /onPress=\{\(\) => router\.replace\('\/'\)\}/);
  assert.match(b, /name="chevron\.left"/);
  const e = src('i18n/en.ts');
  assert.match(e, /backToRooms: 'Back to rooms',/);
  assert.match(e, /people: \{[\s\S]*?\n      back: 'Back',/);
});
