// Run: npm test. F-RT2: with Reduce Transparency every header item draws one shared opaque lift surface.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const helper = read('../src/components/rt-header.tsx');

test('the shared surface: lift fill, 0.5 pt hairline (light only, B1), light shadow, 44 pt targets, no shared bar background', () => {
  assert.match(helper, /backgroundColor: pal\.lift/);
  assert.doesNotMatch(helper, /\bcolors\./, 'a dynamic color resolves light inside the native header (F-RT1)');
  assert.match(helper, /borderWidth: StyleSheet\.hairlineWidth/);
  assert.match(helper, /RT_HAIRLINE = 'rgba\(48,43,40,0\.08\)'/);
  assert.match(helper, /elevation\.lift\.light\.boxShadow/);
  assert.match(helper, /size\.hit/);
  assert.equal((helper.match(/hidesSharedBackground: true/g) ?? []).length, 2);
  assert.match(helper, /tintColor=\{pal\.ink\}/);
  assert.match(read('../src/features/chat/chat-header.tsx'), /tintColor=\{rt \? pal\.ink : colors\.label\}/);
});

// Tab bar: Today has no header buttons any more (the profile avatar is the tab header's), so only chat remains.
test('Chat back and chat bell/gear use the helper only when RT is on', () => {
  const chat = read('../src/app/room/[id]/index.tsx');
  assert.match(chat, /reduceTransparency\s*\? \{/);
  assert.match(chat, /rtBackOptions\(\(\) => router\.back\(\), en\.room\.back\)/);
  assert.match(chat, /rtRightOptions\(\s*<ChatHeaderButtons[\s\S]*?\brt\b/);
});
