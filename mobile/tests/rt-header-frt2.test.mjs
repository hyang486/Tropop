// Run: npm test. F-RT2: with Reduce Transparency every header item draws one shared opaque lift surface.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const helper = read('../src/components/rt-header.tsx');

test('the shared surface: lift fill, 0.5 pt hairline in both schemes, light shadow, 44 pt targets, no shared bar background', () => {
  assert.match(helper, /backgroundColor: colors\.lift/);
  assert.match(helper, /borderWidth: StyleSheet\.hairlineWidth/);
  assert.match(helper, /light: 'rgba\(0,0,0,0\.08\)', dark: 'rgba\(255,255,255,0\.10\)'/);
  assert.match(helper, /elevation\.lift\.light\.boxShadow/);
  assert.match(helper, /size\.hit/);
  assert.equal((helper.match(/hidesSharedBackground: true/g) ?? []).length, 2);
  assert.match(helper, /tintColor=\{colors\.label\}/);
});

test('Rooms capsule, chat back and chat bell/gear all use the helper only when RT is on', () => {
  const rooms = read('../src/app/index.tsx');
  assert.match(rooms, /reduceTransparency \? \(\s*\/\/ F-RT2/);
  assert.match(rooms, /rtRightOptions\(/);
  const chat = read('../src/app/room/[id]/index.tsx');
  assert.match(chat, /reduceTransparency\s*\? \{/);
  assert.match(chat, /rtBackOptions\(\(\) => router\.back\(\), en\.room\.back\)/);
  assert.match(chat, /rtRightOptions\(\s*<ChatHeaderButtons[\s\S]*?\brt\b/);
});
