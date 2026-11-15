// Run: npm test. UX2-127: no cold notification prompt from the Rooms list; the room screen still asks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { permissionStep } from '../src/lib/reminders-plan.ts';

test('UX2-127: granted schedules; ask:false never asks; the default still asks', () => {
  assert.equal(permissionStep({ granted: true, canAskAgain: true }, undefined), 'granted');
  assert.equal(permissionStep({ granted: true, canAskAgain: true }, { ask: false }), 'granted');
  assert.equal(permissionStep({ granted: false, canAskAgain: true }, { ask: false }), 'no');
  assert.equal(permissionStep({ granted: false, canAskAgain: true }, undefined), 'ask');
  assert.equal(permissionStep({ granted: false, canAskAgain: true }, {}), 'ask');
  assert.equal(permissionStep({ granted: false, canAskAgain: true }, { ask: true }), 'ask');
  assert.equal(permissionStep({ granted: false, canAskAgain: false }, undefined), 'no');
});

const lib = readFileSync(new URL('../src/lib/expiry-reminders.ts', import.meta.url), 'utf8');
const rooms = readFileSync(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8');
const chat = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');

test('UX2-127: the lib takes an optional { ask } and asks only on the ask step', () => {
  assert.match(lib, /export async function syncExpiryReminders\(rooms: ReminderRoom\[\], complete: boolean, options\?: \{ ask\?: boolean \}\)/);
  assert.match(lib, /permissionStep\(current, options\)/);
});

test('UX2-127: Rooms passes ask:false; UX2-130: chat passes ask:false too (the in-chat card asks)', () => {
  assert.match(rooms, /syncExpiryReminders\(\s*list\.filter\(\(r\) => r\.deleted_at === null\),\s*true,\s*\{ ask: false \},?\s*\)/);
  assert.match(chat, /syncExpiryReminders\(\[room\], false, \{ ask: false \}\);/);
});
