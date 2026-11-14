// Run: npm test. UX P2-10: enter motion and Reduce Motion.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { enterMotion } from '../src/lib/motion-plan.ts';

test('overlays enter over 200 ms, rising 8 pt from transparent', () => {
  assert.deepEqual(enterMotion(false), { duration: 200, fromOpacity: 0, fromTranslateY: 8 });
});

test('with Reduce Motion the enter is opacity only', () => {
  assert.deepEqual(enterMotion(true), { duration: 200, fromOpacity: 0, fromTranslateY: 0 });
});

