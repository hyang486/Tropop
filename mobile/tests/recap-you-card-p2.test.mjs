// Run: npm test. P2: the "You in this room" card hides 0-count rows and hides itself when every row is empty.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { myPartRows } from '../src/features/recap/recap-plan.ts';

const s = {
  messages: (n) => `${n} messages sent`,
  media: (n) => `${n} photos and files shared`,
  photosOfMe: (n) => `${n} photos of you`,
  arrived: (t) => `Arrived at ${t}`,
};
const time = () => '7:05 PM';
const me = (o) => ({ messages: null, mediaShared: null, photosOfMe: null, arrivedAt: null, pace: null, ...o });

test('P2 You card: 0 and unknown counts are hidden, others stay in order', () => {
  assert.deepEqual(myPartRows(me({ messages: 3, mediaShared: 0, photosOfMe: 2 }), s, time), ['3 messages sent', '2 photos of you']);
  assert.deepEqual(
    myPartRows(me({ messages: 0, mediaShared: 1, photosOfMe: null, arrivedAt: '2026-11-15T03:05:00Z', pace: 'Walked 2 km' }), s, time),
    ['1 photos and files shared', 'Arrived at 7:05 PM', 'Walked 2 km'],
  );
});

test('P2 You card: every row 0 or empty → no rows, so the card is hidden', () => {
  assert.deepEqual(myPartRows(me({ messages: 0, mediaShared: 0, photosOfMe: 0 }), s, time), []);
  assert.deepEqual(myPartRows(me({}), s, time), []);
});
