// Run: npm test. UX3-B05 (S5, D4): Trok sits in the composer's trailing slot while the field is empty; typing turns
// the slot into the send arrow (150 ms cross-fade, instant with Reduce Motion). The chat FAB and the header Q on
// Map, Photos & files, Room info and People to meet are gone.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const plan = await import('../src/components/composer-plan.ts');
const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const composer = read('components/composer.tsx');
const fab = read('features/event/qrewing-fab.tsx');
const chat = read('app/room/[id]/index.tsx');
const en = read('i18n/en.ts');

test('slot: Trok while empty (if offered), send once typed or busy, nothing otherwise', () => {
  assert.equal(plan.composerSlot('', false, true), 'idle');
  assert.equal(plan.composerSlot('   ', false, true), 'idle');
  assert.equal(plan.composerSlot('hi', false, true), 'send');
  assert.equal(plan.composerSlot('', true, true), 'send');
  assert.equal(plan.composerSlot('', false, false), 'none');
  assert.equal(plan.composerSlot('hi', false, false), 'send');
  assert.equal(plan.COMPOSER_FADE_MS, 150);
  assert.equal(plan.composerFadeMs(true), 0);
  assert.equal(plan.composerFadeMs(false), 150);
});

test('composer: 36 pt round Q with a 1 pt separator ring, 44 pt hit, label and hint from the caller', () => {
  assert.match(composer, /slot: \{ width: 36, height: 36/);
  assert.match(composer, /hitSlop=\{4\}/);
  assert.match(composer, /accessibilityLabel=\{idleAction\.label\}/);
  assert.match(composer, /accessibilityHint=\{idleAction\.hint\}/);
  assert.match(fab, /composerMark: \{[^}]*width: 36, height: 36/);
  assert.match(fab, /borderWidth: 1, borderColor: colors\.separator/);
  assert.match(en, /composerLabel: 'Trok'/);
  assert.match(en, /composerHint: 'Opens Trok AI\.'/);
});

test('chat passes the one Ask button to the composer only when available; no FAB or FAB padding', () => {
  assert.match(chat, /idleAction=\{ask\.available \? \{/);
  assert.match(chat, /onPress: ask\.open/);
  assert.match(chat, /\{ask\.sheet\}/);
  assert.doesNotMatch(chat, /QrewingFab|QREWING_FAB_CLEARANCE/);
  assert.doesNotMatch(fab, /export function QrewingFab/);
});

test('no header Q on Map, Photos & files, Room info or People to meet', () => {
  for (const p of ['app/room/[id]/map.tsx', 'app/room/[id]/gallery.tsx', 'app/room/[id]/info.tsx', 'features/event/people-screen.tsx']) {
    const src = read(p);
    assert.doesNotMatch(src, /QrewingHeaderButton|useQrewingAskButton/, p);
  }
  assert.doesNotMatch(fab, /export function QrewingHeaderButton/);
});
