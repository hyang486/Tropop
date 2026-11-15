// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { disclosureHeld } from '../src/lib/emergency-plan.ts';

const room = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');

test('UX2-110: the Trok AI disclosure waits while an Emergency is open, the area failed, or it is still unknown', () => {
  const base = { loading: false, error: null, count: 0, stale: false, slow: false };
  assert.equal(disclosureHeld(base), false);
  assert.equal(disclosureHeld({ ...base, count: 1 }), true);
  assert.equal(disclosureHeld({ ...base, error: new Error('x') }), true);
  assert.equal(disclosureHeld({ ...base, stale: true }), true);
  assert.equal(disclosureHeld({ ...base, loading: true }), true);
});

test('UX2-110 guard: a first read over 3 s skips the automatic sheet for the visit, even after it ends with none', () => {
  const base = { loading: false, error: null, count: 0, stale: false, slow: false };
  assert.equal(disclosureHeld({ ...base, slow: true }), true);
  assert.equal(disclosureHeld({ ...base, loading: true, slow: true }), true);
});

test('UX2-110: the hold gates only the automatic sheet; a tap on Ask (askConsent) still opens it', () => {
  assert.match(room, /\(qrewing\.gates\.disclosure &&\s+!disclosureClosed &&\s+!disclosureHeld\(\{/);
  assert.match(room, /\|\|\s+askConsent;/);
});
