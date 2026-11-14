// Run: npm test. UX2-114: End room, End activity and Leave say when an Emergency is still open.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { emergencyCheckLine, endEmergencyNote, spokenEllipsis } from '../src/lib/emergency-plan.ts';
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

test('UX2-114: no open Emergency, no line', () => {
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: [], userId: 'h', names, copy }), null);
});

test('UX2-114 (ux C36 a): one open Emergency, names loading or failed or missing: the nameless line at once', () => {
  const room = 'An Emergency is still open. Ending the room removes it for everyone.';
  const activity = 'An Emergency is still open. Ending the activity stops live location for everyone.';
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: open('g'), userId: 'h', names: null, copy }), room);
  assert.equal(endEmergencyNote({ kind: 'activity', emergencies: open('g'), userId: 'h', names: null, copy }), activity);
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: open('x'), userId: 'h', names, copy }), room);
  assert.equal(endEmergencyNote({ kind: 'room', emergencies: open('g'), userId: 'h', names: new Map(), copy }), room);
});

test('UX2-114 (ux C36 b): check line: failed read, slow read (> 3 s), or nothing', () => {
  assert.equal(emergencyCheckLine({ loading: false, error: new Error('x'), slow: false, hasNote: false }), 'failed');
  assert.equal(emergencyCheckLine({ loading: true, error: null, slow: true, hasNote: false }), 'checking');
  assert.equal(emergencyCheckLine({ loading: true, error: null, slow: false, hasNote: false }), null);
  assert.equal(emergencyCheckLine({ loading: false, error: null, slow: true, hasNote: false }), null);
  // A known open Emergency (from an earlier read) wins over the failed line.
  assert.equal(emergencyCheckLine({ loading: false, error: new Error('x'), slow: false, hasNote: true }), null);
  assert.equal(copy.checkFailed, "Couldn't check for open Emergencies.");
  assert.equal(copy.checking, 'Checking for Emergencies…');
  assert.equal(copy.tryAgain, 'Try again');
});

test('UX2-114 (ux C36 b): VoiceOver drops the trailing … and ends with a period', () => {
  assert.equal(spokenEllipsis('Checking for Emergencies…'), 'Checking for Emergencies.');
  assert.equal(spokenEllipsis("Couldn't check for open Emergencies."), "Couldn't check for open Emergencies.");
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
  assert.match(endConfirm, /\{emergencyNote \? <EmergencyOpenNote text=\{emergencyNote\} \/> : null\}\s*\{checkLine \? <EmergencyCheckNote line=\{checkLine\} onRetry=\{activity\.reload\} \/> : null\}\s*\{error \?/);
});

test('UX2-114: Room info puts the Leave note above the footer buttons', () => {
  assert.match(info, /useRoomActivity\(id, userId, 0\)/);
  assert.match(info, /actions=\{\s*<>\s*\{leaveNote \? <EmergencyOpenNote text=\{leaveNote\} \/> : null\}/);
});

const note = readFileSync(new URL('../src/components/emergency-open-note.tsx', import.meta.url), 'utf8');

test('UX2-114 (ux C36 b): both screens show the check line, End and Leave stay enabled', () => {
  for (const src of [endConfirm, info]) {
    assert.match(src, /<EmergencyCheckNote\b/);
    assert.match(src, /emergencyCheckLine\(/);
  }
  assert.match(note, /export function EmergencyCheckNote/);
  assert.match(note, /setTimeout\([^]*?3000\)/);
  assert.match(note, /minHeight: 44/);
  assert.match(note, /spokenEllipsis\(/);
  assert.match(note, /ActivityIndicator/);
  // Pattern E: Try again is busy (spinner, "Trying again") from the press until the reload settles.
  assert.equal(copy.tryingAgain, 'Trying again');
  assert.match(note, /setRetrying\(true\)[^]*?finally\(\(\) => setRetrying\(false\)\)/);
  assert.match(note, /accessibilityState=\{\{ busy: retrying \}\}/);
});

test('UX2-114 (ux C36 c): the guest Leave Alert says to tap I\'m OK now first while my Emergency is on', () => {
  assert.match(info, /Alert\.alert\(en\.room\.leaveConfirmTitle, leaveNote \?\? en\.room\.leaveConfirmBody,/);
});
