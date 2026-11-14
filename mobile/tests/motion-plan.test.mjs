// Run: npm test. UX P2-10: enter motion and Reduce Motion.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { enterMotion, readReduceMotion } from '../src/lib/motion-plan.ts';

test('overlays enter over 200 ms, rising 8 pt from transparent', () => {
  assert.deepEqual(enterMotion(false), { duration: 200, fromOpacity: 0, fromTranslateY: 8 });
});

test('with Reduce Motion the enter is opacity only', () => {
  assert.deepEqual(enterMotion(true), { duration: 200, fromOpacity: 0, fromTranslateY: 0 });
});


test('the Reduce Motion read passes the setting through', async () => {
  assert.equal(await readReduceMotion(async () => false), false);
  assert.equal(await readReduceMotion(async () => true), true);
});

test('a failed Reduce Motion read counts as reduced, so the Emergency bar still shows', async () => {
  assert.equal(await readReduceMotion(() => Promise.reject(new Error('native'))), true);
  assert.equal(
    await readReduceMotion(() => {
      throw new Error('sync');
    }),
    true,
  );
});
