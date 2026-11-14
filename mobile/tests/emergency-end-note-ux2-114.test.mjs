// Run: npm test. UX2-114: End room, End activity and Leave say when an Emergency is still open.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { endEmergencyNote } from '../src/lib/emergency-plan.ts';
import { en } from '../src/i18n/en.ts';

const copy = en.emergencyOpen;

const names = new Map([['h', 'Sora'], ['g', 'Mina'], ['k', 'Joon']]);
const open = (...ids) => ids.map((userId) => ({ userId }));

test('UX2-114: End room / End activity name the one open Emergency', () => {
  assert.equal(
    endEmergencyNote({ kind: 'room', emergencies: open('g'), userId: 'h', names, copy }),
    "Mina's Emergency is still open. Ending the room removes it for everyone.",
  );
  assert.equal(
    endEmergencyNote({ kind: 'activity', emergencies: open('g'), userId: 'h', names, copy }),
    "Mina's Emergency is still open. Ending the activity stops live location for everyone.",
  );
});

test('UX2-114: two or more open Emergencies give the count line', () => {
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: open('g', 'k'), userId: 'h', names, copy }), '2 Emergencies are still open.');
  assert.equal(endEmergencyNote({ kind: 'activity', emergencies: open('g', 'k', 'h'), userId: 'h', names, copy }), '3 Emergencies are still open.');
});

test('UX2-114: no open Emergency, no line; names not loaded yet, no line for one', () => {
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: [], userId: 'h', names, copy }), null);
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: open('g'), userId: 'h', names: null, copy }), null);
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: open('x'), userId: 'h', names, copy }).startsWith("Someone's Emergency"), true);
});

test('UX2-114: Leave shows a line only for my own open Emergency', () => {
  assert.equal(
    endEmergencyNote({ kind: 'leave', emergencies: open('g', 'k'), userId: 'g', names, copy }),
    "Your Emergency is still on. Tap I'm OK now first.",
  );
  assert.equal(endEmergencyNote({ kind: 'leave', emergencies: open('k'), userId: 'g', names, copy }), null);
});

const endConfirm = readFileSync(new URL('../src/components/end-confirm.tsx', import.meta.url), 'utf8');
const info = readFileSync(new URL('../src/app/room/[id]/info.tsx', import.meta.url), 'utf8');

test('UX2-114: End confirm reads the activity and puts the note above the buttons', () => {
  assert.match(endConfirm, /useRoomActivity\(id \?\? '', userId, 0\)/);
  assert.match(endConfirm, /\{emergencyNote \? <EmergencyOpenNote text=\{emergencyNote\} \/> : null\}\s*\{error \?/);
});

test('UX2-114: Room info puts the Leave note above the footer buttons', () => {
  assert.match(info, /useRoomActivity\(id, userId, 0\)/);
  assert.match(info, /actions=\{\s*<>\s*\{leaveNote \? <EmergencyOpenNote text=\{leaveNote\} \/> : null\}/);
});
