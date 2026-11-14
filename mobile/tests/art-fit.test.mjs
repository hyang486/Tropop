import assert from 'node:assert/strict';
import { test } from 'node:test';
const { artHidden } = await import('../src/lib/keyboard-plan.ts');

const base = { keyboardUp: false, shown: true, content: 700, view: 700, free: 0, art: 150, slack: 40 };

test('UX2-61: art hides while the keyboard is up, even when it would fit', () => {
  assert.equal(artHidden({ ...base, keyboardUp: true, free: 999 }), true);
  assert.equal(artHidden({ ...base, keyboardUp: true, shown: false, free: 999 }), true);
});

test('UX2-61: shown art stays while the body fits and hides once it overflows', () => {
  assert.equal(artHidden(base), false);
  assert.equal(artHidden({ ...base, content: 701 }), false);
  assert.equal(artHidden({ ...base, content: 760 }), true);
});

test('UX2-61: hidden art returns only when the free space holds it plus slack (no flip-flop)', () => {
  const hidden = { ...base, shown: false };
  assert.equal(artHidden({ ...hidden, free: 189 }), true);
  assert.equal(artHidden({ ...hidden, free: 190 }), false);
});
