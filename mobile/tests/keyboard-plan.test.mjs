// Run: npm test (node --test, Node 24 strips the .ts types).
// QScreen keyboard (qa K1/K2 at 595f1cf): pad the root by the covered part, scroll the focused field into view.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keyboardOverlap, revealScrollY } from '../src/lib/keyboard-plan.ts';

// iPhone 17 Pro-ish: window 874 pt, keyboard top at 538 pt.
test('full-screen root: pad by the keyboard height above the root bottom', () => {
  assert.equal(keyboardOverlap({ y: 0, height: 874 }, 538), 336);
});

test('pageSheet root (K2): starts lower and is shorter, still padded to the keyboard top', () => {
  // Sheet from y 62 to 874: the covered part is the same 336 pt, not 336 + an offset measured mid-animation.
  assert.equal(keyboardOverlap({ y: 62, height: 812 }, 538), 336);
});

test('keyboard hidden or below the root: no padding', () => {
  assert.equal(keyboardOverlap({ y: 0, height: 874 }, null), 0);
  assert.equal(keyboardOverlap({ y: 0, height: 500 }, 538), 0);
});

const visible = { top: 100, bottom: 450 }; // the scroll body between the header and the pinned actions

test('K1: a field below the fold scrolls up to sit above the actions with a margin', () => {
  // Status options at 520-600 in the window, body ends at 450: scroll by 600 - (450 - 16) = 166.
  assert.equal(revealScrollY(40, { top: 520, bottom: 600 }, visible, 1000), 206);
});

test('a field already in view does not scroll', () => {
  assert.equal(revealScrollY(40, { top: 200, bottom: 250 }, visible, 1000), null);
});

test('a field above the view (under the header) scrolls down to it', () => {
  assert.equal(revealScrollY(300, { top: 60, bottom: 110 }, visible, 1000), 244);
});

test('the scroll is clamped to the scrollable range', () => {
  assert.equal(revealScrollY(40, { top: 520, bottom: 600 }, visible, 120), 120);
  assert.equal(revealScrollY(10, { top: 60, bottom: 110 }, visible, 1000), 0);
});

test('a field taller than the view is aligned at its top', () => {
  assert.equal(revealScrollY(0, { top: 300, bottom: 800 }, visible, 1000), 184);
});

test('K2: the submit button comes into view with the field when both fit', () => {
  // Email 300-348 is visible, but the button at 470-522 is under the keyboard: show both.
  assert.equal(revealScrollY(0, { top: 300, bottom: 348 }, visible, 1000, { top: 470, bottom: 522 }), 88);
});

test('K2: when field and button do not fit together, the field wins', () => {
  assert.equal(revealScrollY(0, { top: 300, bottom: 348 }, visible, 1000, { top: 700, bottom: 752 }), null);
});
