// Run: npm test. C14 sweep 7: pace card hint while there is no position yet or location is off.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const h = await import('../src/features/pace/location-hint.ts');

test('C14 sweep 7: denied, finding, still looking once late, nothing once a fix arrived or sharing is off', () => {
  assert.equal(h.locationHint({ sharing: 'no-permission', hasFix: false, late: false }), 'denied');
  assert.equal(h.locationHint({ sharing: 'starting', hasFix: false, late: false }), 'finding');
  assert.equal(h.locationHint({ sharing: 'sharing', hasFix: false, late: false }), 'finding');
  assert.equal(h.locationHint({ sharing: 'sharing', hasFix: false, late: true }), 'still');
  assert.equal(h.locationHint({ sharing: 'sharing', hasFix: true, late: true }), null);
  assert.equal(h.locationHint({ sharing: 'off', hasFix: false, late: true }), null);
  assert.equal(h.locationHint({ sharing: 'error', hasFix: false, late: true }), null);
});
