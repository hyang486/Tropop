// Run: npm test. UX2-128: Room info says when reminders are off (notification permission denied).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { remindersOffShown } from '../src/lib/reminders-plan.ts';
import { en } from '../src/i18n/en.ts';

test('UX2-128: only a denied permission shows the line', () => {
  assert.equal(remindersOffShown('denied'), true);
  assert.equal(remindersOffShown('granted'), false);
  assert.equal(remindersOffShown('undetermined'), false);
  assert.equal(remindersOffShown(null), false);
});

test('UX2-128: copy', () => {
  assert.equal(en.room.remindersOff, "Reminders are off, so you won't get a heads-up before this room ends.");
  assert.equal(en.room.openSettings, 'Open Settings');
});

const note = readFileSync(new URL('../src/components/reminders-off-note.tsx', import.meta.url), 'utf8');
const info = readFileSync(new URL('../src/app/room/[id]/info.tsx', import.meta.url), 'utf8');

test('UX2-128: reads the permission without a prompt, on mount and on active; ink2, 44 pt Open Settings', () => {
  assert.match(note, /getPermissionsAsync\(\)/);
  assert.doesNotMatch(note, /requestPermissionsAsync/);
  assert.match(note, /AppState\.addEventListener\('change'/);
  assert.match(note, /Linking\.openSettings\(\)/);
  assert.match(note, /minHeight: 44/);
  assert.match(note, /colors\.ink2/);
  assert.doesNotMatch(note, /errorText|danger/);
});

test('UX2-128: the line sits right under the Ends card in Room info', () => {
  assert.match(info, /<QRowCard icon="clock" title=\{endsLine\} subtitle=\{en\.room\.endsSoonInfo\} \/>\s*<RemindersOffNote \/>/);
});
