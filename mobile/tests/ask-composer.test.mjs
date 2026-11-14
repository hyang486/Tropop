import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const composer = readFileSync(new URL('../src/components/composer.tsx', import.meta.url), 'utf8');
const ask = readFileSync(new URL('../src/features/event/ask-screen.tsx', import.meta.url), 'utf8');

test('P1-11 composer: 44 pt field, 22 pt radius, 32 pt ink up-arrow circle hidden while empty', () => {
  assert.match(composer, /minHeight: size\.hit/);
  assert.match(composer, /borderRadius: 22/);
  assert.match(composer, /width: 32,\s*height: 32,\s*borderRadius: 16/);
  assert.match(composer, /backgroundColor: colors\.tint/);
  assert.match(composer, /name="arrow\.up"/);
  // UX3-B05: the empty-field rule moved to composer-plan (composerSlot); send shows once typed or busy.
  assert.match(composer, /showCircle = slot === 'send'/);
});

test('P1-11 Ask uses the shared composer, not a separate Send button', () => {
  assert.match(ask, /<Composer\b/);
  assert.doesNotMatch(ask, /title=\{s\.send\}/);
});
