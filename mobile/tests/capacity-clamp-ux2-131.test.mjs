// Run: npm test. UX2-131: a typed people count above the plan max is clamped, and the screen says so.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { capacityClampNote } from '../src/lib/capacity-clamp-plan.ts';
import { capacityMax } from '../src/features/event/open-room-plan.ts';
import { en } from '../src/i18n/en.ts';

const copy = en.createRoom;
// The screen passes capacityMax(plus); lib plan files take it as a value (no runtime imports).
const note = (text, plus) => capacityClampNote(text, plus, capacityMax(plus), copy);

test('UX2-131: Free host typing above 6 gets the Free line with See Plus', () => {
  assert.deepEqual(note('99', false), { text: 'Free rooms hold up to 6.', link: true });
  assert.deepEqual(note('7', false), { text: 'Free rooms hold up to 6.', link: true });
  assert.equal(copy.seePlus, 'See Plus');
});

test('UX2-131: Plus host typing above 30 gets "Rooms hold up to 30." with no link', () => {
  assert.deepEqual(note('99', true), { text: 'Rooms hold up to 30.', link: false });
});

test('UX2-131: no line when nothing was clamped down (in range, at max, below 2, not a number, plan loading)', () => {
  assert.equal(note('6', false), null);
  assert.equal(note('4', false), null);
  assert.equal(note('30', true), null);
  assert.equal(note('1', false), null);
  assert.equal(note('ab', false), null);
  assert.equal(note('', false), null);
  assert.equal(note('99', null), null);
});

const screen = readFileSync(new URL('../src/app/create-room.tsx', import.meta.url), 'utf8');

test('UX2-131: Done sets the line (never opens Plus) and VoiceOver announces it', () => {
  const commit = screen.slice(screen.indexOf('function commitCapacity()'), screen.indexOf('const [visibility'));
  assert.match(commit, /setClampNote\(capacityClampNote\(capacityDraft, plus, capacityMax\(plus\), en\.createRoom\)\)/);
  assert.doesNotMatch(commit, /plan-preview/);
  assert.match(screen, /useAnnounce\(clampNote\?\.text, clampSeq\)/);
});

test('UX2-131: every stepper change clears the line', () => {
  assert.match(screen, /function stepTo\(delta: 1 \| -1\) \{\s*setClampNote\(null\);/);
  assert.match(screen, /onPress=\{\(\) => stepTo\(-1\)\}/);
  assert.match(screen, /: stepTo\(1\)/);
  assert.match(screen, /function startRepeat\(delta: 1 \| -1\) \{\s*stopRepeat\(\);\s*setClampNote\(null\);/);
});

test('UX2-131 (ux): the clamp line takes the Free at-max slot; at-max returns when the line clears', () => {
  assert.match(
    screen,
    /\{clampNote \? \([^]*?\) : atMax && plus === false \? \(\s*<Text style=\{styles\.atMax\}>/,
  );
  assert.doesNotMatch(screen, /\) : null\}\s*\{\/\* UX2-54: Plus at 30[^]*?\{atMax && plus === false \? \(/);
});

test('UX2-131: the line is ink2 13 pt; See Plus uses the + route with a 44 pt hit', () => {
  assert.match(screen, /clampNote: \{[^}]*fontSize: 13[^}]*color: colors\.ink2/);
  assert.match(screen, /clampLink: \{[^}]*minHeight: 44/);
  const link = screen.slice(screen.indexOf('{clampNote ?'), screen.indexOf('{clampNote ?') + 900);
  assert.match(link, /pathname: '\/plan-preview', params: \{ from: 'capacity' \}/);
});
