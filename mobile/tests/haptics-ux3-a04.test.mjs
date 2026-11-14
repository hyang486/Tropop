import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX3-A04/B03: one haptics helper with exactly 5 calls mapped to the SDK 58 API; errors swallowed', () => {
  const h = src('lib/haptics.ts');
  assert.match(h, /import \* as Haptics from 'expo-haptics';/);
  assert.match(h, /selection: \(\) => fire\(\(\) => Haptics\.selectionAsync\(\)\)/);
  assert.match(h, /press: \(\) => fire\(\(\) => Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Light\)\)/);
  assert.match(h, /success: \(\) => fire\(\(\) => Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\)\)/);
  assert.match(h, /warning: \(\) => fire\(\(\) => Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Warning\)\)/);
  assert.match(h, /error: \(\) => fire\(\(\) => Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Error\)\)/);
  assert.equal((h.match(/^  [a-z]+: \(\) =>/gm) ?? []).length, 5);
  assert.match(h, /run\(\)\.catch\(\(\) => undefined\)/);
  // Only the helper imports expo-haptics.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.dependencies['expo-haptics']);
});
