import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('tabs-spec §1: four tabs in order Today · Explore · Qrews · Moments, JS Tabs with the custom bar', () => {
  const l = src('app/(tabs)/_layout.tsx');
  assert.match(l, /from 'expo-router\/js-tabs'/);
  assert.match(l, /tabBar=\{\(props\) => <TabBar \{\.\.\.props\} \/>\}/);
  const names = [...l.matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, ['index', 'explore', 'qrews', 'calendar']);
  const en = src('i18n/en.ts');
  assert.match(en, /tabs: \{\s+today: 'Today',\s+explore: 'Explore',\s+qrews: 'Qrews',\s+moments: 'Moments',/);
});

test('tabs-spec §1: avatar on every tab root, wordmark on Today and Moments only; /connect redirects to /qrews', () => {
  const l = src('app/(tabs)/_layout.tsx');
  assert.match(l, /headerRight: \(\) => <ProfileAvatarButton \/>/);
  assert.match(l, /route\.name === 'index' \|\| route\.name === 'calendar' \? \(\) => <Wordmark \/>/);
  assert.match(src('features/calendar/calendar-screen.tsx'), /<ProfileAvatarButton \/>/);
  assert.match(src('app/connect/index.tsx'), /<Redirect href="\/qrews" \/>/);
  assert.match(src('app/(tabs)/explore.tsx'), /<OpenChatSection /);
  const root = src('app/_layout.tsx');
  assert.match(root, /<Stack\.Screen name="\(tabs\)" options=\{\{[^}]*headerShown: false/);
  assert.doesNotMatch(root, /<Stack\.Screen name="(index|calendar)"/);
});

test('tabs-spec §2-3: bar tokens, a11y, haptic on change only, re-tap emits tabPress, hides on keyboard', () => {
  const b = src('components/tab-bar.tsx');
  assert.match(b, /accessibilityRole="tabbar"/);
  assert.match(b, /accessibilityRole="tab"\s+accessibilityState=\{\{ selected: focused \}\}/);
  assert.match(b, /if \(focused \|\| event\.defaultPrevented\) return;\s+if \(Platform\.OS === 'ios'\) void Haptics\.selectionAsync\(\);/);
  assert.match(b, /if \(keyboardShown\) return null;/);
  assert.match(b, /pillActive: \{ backgroundColor: colors\.wash \}/);
  assert.match(b, /underline: \{ width: 16, height: 3, borderRadius: 2, marginTop: 4/);
  assert.match(src('components/q-screen.tsx'), /useScrollToTop\(scrollRef\);/);
  for (const n of ['today', 'explore', 'qrews', 'moments'])
    for (const s of ['', '@2x', '@3x']) assert.ok(existsSync(new URL(`../assets/brand/tabs/${n}${s}.png`, import.meta.url)), `${n}${s}`);
});
