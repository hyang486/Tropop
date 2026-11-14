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
  assert.equal(en.media.roomStorageFull, "This room's space is full. Only files that fit the space left can be added.");
});

test('runJob maps both the insert and the ready update through the room-space check', () => {
  const src = readFileSync(new URL('../src/lib/media.ts', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('export async function runJob'), src.indexOf('App-wide upload queue'));
  assert.equal(fn.match(/throw new Error\(uploadErrorText\(error\)\)/g)?.length, 2);
});
