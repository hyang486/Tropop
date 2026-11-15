// Run: npm test. F-EMX3: the room-ended screen clears the chat's bell and gear (dead controls once ChatRoom is gone).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');

test('the RoomEnded branch sets headerRight to null so only the back button stays', () => {
  const before = src.slice(src.indexOf('<RoomEnded') - 200, src.indexOf('<RoomEnded'));
  assert.match(before, /headerRight: \(\) => null/);
});

test('the chat screen still sets the bell and gear for a live room', () => {
  assert.match(src, /headerRight: \(\) => \(\s*<ChatHeaderButtons/);
});
