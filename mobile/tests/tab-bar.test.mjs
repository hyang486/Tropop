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
  assert.match(en, /tabs: \{\s+today: 'Today',\s+explore: 'Explore',\s+qrews: 'Tropals',\s+moments: 'Moments',/);
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
  assert.match(b, /'tabbar'/);
  // §4.1: button on iOS (no UIKit tab trait), tab on web and Android.
  assert.match(b, /accessibilityRole=\{Platform\.OS === 'ios' \? 'button' : 'tab'\}\s+accessibilityState=\{\{ selected: focused \}\}/);
  assert.doesNotMatch(b, /'tabbar'\}[^>]*(accessible\b|onPress|accessibilityLabel)/);
  assert.match(b, /if \(focused \|\| event\.defaultPrevented\) return;\s+if \(Platform\.OS === 'ios'\) void Haptics\.selectionAsync\(\);/);
  assert.match(b, /if \(keyboardShown\) return null;/);
  assert.match(b, /pillActive: \{ backgroundColor: colors\.wash \}/);
  assert.match(b, /underline: \{ width: 16, height: 3, borderRadius: 2, marginTop: 3/);
  // tabs-spec §2-3 (ux decision b): fixed 64 pt bar, 54 pt pill, 24 pt icon, label never scales.
  assert.match(b, /row: \{\n    height: 64,/);
  assert.doesNotMatch(b, /minHeight: 64/);
  assert.match(b, /pill: \{ height: 54, alignItems: .center., gap: 2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18 \}/);
  assert.match(b, /icon: \{ width: 24, height: 24 \}/);
  assert.match(b, /accessibilityLabel=\{label\}\s+\/\/[^\n]*\n\s+accessibilityShowsLargeContentViewer\s+accessibilityLargeContentTitle=\{label\}\s+onPress/);
  assert.match(b, /allowFontScaling=\{false\}\s+>/);
  assert.match(src('components/q-screen.tsx'), /useScrollToTop\(scrollRef\);/);
  for (const n of ['today', 'explore', 'qrews', 'moments'])
    for (const s of ['', '@2x', '@3x']) assert.ok(existsSync(new URL(`../assets/brand/tabs/${n}${s}.png`, import.meta.url)), `${n}${s}`);
});

test('web: the row is a tablist and each tab renders aria-selected (react-native-web ignores accessibilityState)', () => {
  const src = readFileSync(new URL('../src/components/tab-bar.tsx', import.meta.url), 'utf8');
  assert.match(src, /accessibilityRole=\{Platform\.OS === 'web' \? 'tablist' : 'tabbar'\}/);
  assert.match(src, /accessibilityRole=\{Platform\.OS === 'ios' \? 'button' : 'tab'\}/);
  assert.match(src, /aria-selected=\{focused\}/);
});
