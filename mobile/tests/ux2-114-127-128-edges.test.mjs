// Run: npm test. Edge states for UX2-114 (Emergency-open note) and UX2-127/128 (reminder permission).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { emergencyCheckLine, endEmergencyNote, spokenEllipsis } from '../src/lib/emergency-plan.ts';
import { permissionStep, remindersOffShown } from '../src/lib/reminders-plan.ts';
import { en } from '../src/i18n/en.ts';

const copy = en.emergencyOpen;
const names = new Map([['g', 'Mina']]);
const open = (...ids) => ids.map((userId) => ({ userId }));

test('UX2-114 edge: Leave with no user id or no open Emergency gives no line', () => {
  assert.equal(endEmergencyNote({ kind: 'leave', emergencies: open('g'), userId: undefined, names, copy }), null);
  assert.equal(endEmergencyNote({ kind: 'leave', emergencies: [], userId: 'g', names, copy }), null);
});

test('UX2-114 edge: my own single open Emergency on End uses my name like anyone else', () => {
  assert.equal(
    endEmergencyNote({ kind: 'room', emergencies: open('g'), userId: 'g', names, copy }),
    "Mina's Emergency is still open. Ending the room removes it for everyone.",
  );
});

test('UX2-114 edge: activity count line ignores names entirely', () => {
  assert.equal(endEmergencyNote({ kind: 'activity', emergencies: open('a', 'b'), userId: 'g', names: null, copy }), '2 Emergencies are still open.');
});

test('UX2-114 edge: check line: an error wins over loading; a note wins over a slow read', () => {
  assert.equal(emergencyCheckLine({ loading: true, error: new Error('x'), slow: true, hasNote: false }), 'failed');
  assert.equal(emergencyCheckLine({ loading: true, error: null, slow: true, hasNote: true }), null);
  assert.equal(emergencyCheckLine({ loading: false, error: null, slow: false, hasNote: false }), null);
});

test('UX2-114 edge: spokenEllipsis trims a space before "…" and leaves a mid-text "…" alone', () => {
  assert.equal(spokenEllipsis('Checking …'), 'Checking.');
  assert.equal(spokenEllipsis('Wait… then go'), 'Wait… then go');
});

test('UX2-127 edge: granted wins even when iOS says it cannot ask again; ask:false with no re-ask stays no', () => {
  assert.equal(permissionStep({ granted: true, canAskAgain: false }, { ask: false }), 'granted');
  assert.equal(permissionStep({ granted: false, canAskAgain: false }, { ask: false }), 'no');
  assert.equal(permissionStep({ granted: false, canAskAgain: false }, { ask: true }), 'no');
});

test('UX2-128 edge: unknown or empty status shows nothing', () => {
  assert.equal(remindersOffShown(''), false);
  assert.equal(remindersOffShown('provisional'), false);
});

const endConfirm = readFileSync(new URL('../src/components/end-confirm.tsx', import.meta.url), 'utf8');
const info = readFileSync(new URL('../src/app/room/[id]/info.tsx', import.meta.url), 'utf8');
const reminders = readFileSync(new URL('../src/components/reminders-off-note.tsx', import.meta.url), 'utf8');
const note = readFileSync(new URL('../src/components/emergency-open-note.tsx', import.meta.url), 'utf8');

test('UX2-114 edge: End confirm loads names only for exactly one open Emergency; a failed load gives an empty map', () => {
  assert.match(endConfirm, /if \(!id \|\| openCount !== 1\) return;/);
  assert.match(endConfirm, /\.catch\(\(\) => live && setNames\(new Map\(\)\)\)/);
});

test('UX2-114 edge: the host gets no Leave note or check line in Room info', () => {
  assert.match(info, /const leaveNote = isHost\s*\?\s*null/);
  assert.match(info, /const checkLine = isHost\s*\?\s*null/);
});

test('UX2-114 edge: the slow flag resets when loading ends; Try again ignores repeat taps', () => {
  assert.match(note, /return loading && slow;/);
  assert.match(note, /if \(retrying\) return;/);
  assert.match(note, /disabled=\{retrying\}/);
});

test('UX2-128 edge: the permission read stops after unmount and removes the AppState listener', () => {
  assert.match(reminders, /live && setStatus\(p\.status\)/);
  assert.match(reminders, /live = false;\s*sub\.remove\(\);/);
});
