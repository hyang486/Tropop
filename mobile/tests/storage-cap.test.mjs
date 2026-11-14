// Run: npm test. Capacity option B (0033): a full room's PT507 shows the room-space copy.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const { isRoomStorageFull } = await import('../src/lib/storage-cap.ts');
const { en } = await import('../src/i18n/en.ts');

test('only PT507 room_storage_full counts as a full room', () => {
  assert.equal(isRoomStorageFull({ code: 'PT507', message: 'room_storage_full', details: 'This room is out of space.' }), true);
  assert.equal(isRoomStorageFull({ code: 'PT507', message: 'other' }), false);
  assert.equal(isRoomStorageFull({ code: 'PT402', message: 'plan_limit' }), false);
  assert.equal(isRoomStorageFull({ code: '22023', message: 'The original file is missing or empty' }), false);
  assert.equal(isRoomStorageFull(null), false);
  assert.equal(isRoomStorageFull('PT507'), false);
});

test('the copy is the approved line', () => {
  assert.equal(en.media.roomStorageFull, 'This file is too big for the space left in this room. Smaller files may still fit.');
});

test('runJob maps both the insert and the ready update through the room-space check', () => {
  const src = readFileSync(new URL('../src/lib/media.ts', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('export async function runJob'), src.indexOf('App-wide upload queue'));
  assert.equal(fn.match(/throw uploadError\(error\)/g)?.length, 2);
  // UX2-06: the wrapper keeps the dead end, so a full room or bad file never offers Retry.
  assert.match(fn, /deadEnd: deadEndOf\(e\)/);
});

test('UX2-06: dead-end uploads carry their kind and the right next step', async () => {
  const { deadEndError, deadEndOf, deadEndStep } = await import('../src/lib/storage-cap.ts');
  assert.equal(deadEndOf(deadEndError('storage', 'x')), 'storage');
  assert.equal(deadEndOf(deadEndError('file', 'x')), 'file');
  assert.equal(deadEndOf(new Error('offline')), undefined);
  assert.equal(deadEndOf(null), undefined);
  assert.equal(deadEndStep({ deadEnd: 'storage', isHost: true, hostPlan: 'free' }), 'plus');
  assert.equal(deadEndStep({ deadEnd: 'storage', isHost: true, hostPlan: 'plus' }), null);
  assert.equal(deadEndStep({ deadEnd: 'storage', isHost: false, hostPlan: 'loading' }), null);
  assert.equal(deadEndStep({ deadEnd: 'file', isHost: true, hostPlan: 'free' }), null);
  assert.equal(en.media.outOfSpace, 'Not enough space left in this room for this file.');
  assert.equal(en.media.outOfSpaceHint, 'Smaller files may still fit.');
  assert.equal(en.media.cantUpload, "This file can't be uploaded.");
});

test('C14: a Plus gate shows only for a confirmed Free plan; loading reserves, offline says so', async () => {
  const { deadEndStep, planState } = await import('../src/lib/storage-cap.ts');
  assert.equal(planState(undefined, false), 'loading');
  assert.equal(planState(undefined, true), 'loading');
  assert.equal(planState(false, false), 'offline'); // no server read, nothing cached: never guess Free
  assert.equal(planState(true, false), 'offline');
  assert.equal(planState(false, true), 'free');
  assert.equal(planState(true, true), 'plus');
  assert.equal(deadEndStep({ deadEnd: 'storage', isHost: true, hostPlan: 'loading' }), 'reserve');
  assert.equal(deadEndStep({ deadEnd: 'storage', isHost: true, hostPlan: 'offline' }), 'offline');
  assert.equal(en.planPreview.offline, "Can't check your plan offline. Try again when you're back.");
});

test('C14: the plan cache stores Free as 0 so an offline Free host is known, and an unknown plan is marked', () => {
  const src = readFileSync(new URL('../src/features/calendar/calendar-store.ts', import.meta.url), 'utf8');
  assert.match(src, /setItem\(plusPreviewKey\(uid\), '0'\)/);
  assert.doesNotMatch(src, /removeItem\(plusPreviewKey/);
  assert.match(src, /if \(server === null && cached === null\) plusUnknown\.add\(uid\)/);
  const gallery = readFileSync(new URL('../src/app/room/[id]/gallery.tsx', import.meta.url), 'utf8');
  assert.match(gallery, /usePlanState\(isHost \? userId : null\)/);
  assert.doesNotMatch(gallery, /usePlusPreview/);
});
