// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';
import { REMINDER_WINDOW_MS } from '../src/lib/expiry-plan.ts';
import {
  REMINDER_CARD_MIN_LEFT_MS,
  reminderCardKey,
  reminderCardShown,
} from '../src/features/event/reminder-card-plan.ts';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const ask = read('features/event/ask-screen.tsx');
const people = read('features/event/people-screen.tsx');
const room = read('app/room/[id]/index.tsx');
const card = read('features/event/reminder-card.tsx');

test('UX2-129: copy', () => {
  assert.equal(en.qrewing.ask.notMemberTitle, "You're not in this room anymore");
  assert.equal(en.qrewing.ask.notMemberMessage, "The room ended or you left it. Your question wasn't sent.");
  assert.equal(en.qrewing.people.notMemberTitle, "You're not in this room anymore");
  assert.equal(en.qrewing.people.notMemberMessage, 'The room ended or you left it.');
  assert.equal(en.qrewing.ask.notMemberOk, 'OK');
  assert.equal(en.qrewing.people.notMemberOk, 'OK');
});

test('UX2-129: Ask purges, then alerts, and closes only on OK', () => {
  const at = ask.indexOf("res.error === 'not_member'");
  const block = ask.slice(at, ask.indexOf('return;', at));
  assert.ok(block.indexOf('purgeAskHistory(id)') < block.indexOf('Alert.alert'));
  assert.match(block, /Alert\.alert\(s\.notMemberTitle, s\.notMemberMessage, \[\{ text: s\.notMemberOk, onPress: \(\) => router\.back\(\) \}\]/);
  assert.match(block, /cancelable: false/);
  assert.doesNotMatch(block.replace(/onPress: \(\) => router\.back\(\)/, ''), /router\.back\(\)/);
});

test('UX2-129: People alerts once, closes on OK', () => {
  const at = people.indexOf("const left = gate === 'left';");
  const block = people.slice(at, people.indexOf('}, [left, router]);', at));
  assert.match(block, /if \(!left \|\| leftAlerted\.current\) return;/);
  assert.match(block, /onPress: \(\) => router\.canGoBack\(\) && router\.back\(\)/);
  assert.match(block, /cancelable: false/);
  assert.equal((block.match(/router\.back\(\)/g) ?? []).length, 1);
});

test('UX2-130: when the card shows', () => {
  assert.equal(REMINDER_CARD_MIN_LEFT_MS, REMINDER_WINDOW_MS);
  const base = { permission: 'undetermined', remainingMs: REMINDER_WINDOW_MS + 1, emergencyOpen: false, dismissed: false };
  const s = (o) => reminderCardShown({ ...base, ...o });
  assert.equal(s({}), true);
  assert.equal(s({ permission: 'granted' }), false);
  assert.equal(s({ permission: 'denied' }), false);
  assert.equal(s({ permission: null }), false);
  assert.equal(s({ remainingMs: REMINDER_WINDOW_MS }), false);
  assert.equal(s({ emergencyOpen: true }), false);
  assert.equal(s({ dismissed: true }), false);
  assert.equal(s({ dismissed: null }), false);
  assert.equal(reminderCardKey('r1'), 'qrewing.reminderCard.v1.r1');
});

test('UX2-130: copy', () => {
  assert.equal(en.chat.reminderCardTitle, 'Get a reminder a day before this room ends?');
  assert.equal(en.chat.reminderCardTurnOn, 'Turn on');
  assert.equal(en.chat.reminderCardNotNow, 'Not now');
});

test('UX2-130: the room screen never prompts; the card sits in the newest cell', () => {
  assert.match(room, /syncExpiryReminders\(\[room\], false, \{ ask: false \}\)/);
  assert.doesNotMatch(room, /syncExpiryReminders\(\[room\], false\)/);
  assert.match(room, /useReminderCard\(room, remainingMs, activity\.emergencies\.length > 0\)/);
  assert.match(room, /index === 0 && reminderCard\.shown/);
  // UX3-B04: day and collapsed-run rows render the card too (4 row types).
  assert.equal((room.match(/\{card\}/g) ?? []).length, 4);
  assert.match(room, /extraData=\{reminderCard\.shown \|\| reminderCard\.busy\}/);
});

test('UX2-130: Turn on asks then re-syncs with ask: true; Not now is stored per room', () => {
  const on = card.slice(card.indexOf('async function turnOn'), card.indexOf('function notNow'));
  assert.ok(on.indexOf('requestPermissionsAsync') < on.indexOf('syncExpiryReminders([room], false, { ask: true })'));
  assert.match(card, /AsyncStorage\.setItem\(reminderCardKey\(room\.id\), '1'\)/);
  assert.match(card, /Notifications\.getPermissionsAsync\(\)/);
});

test('UX2-130: look and VoiceOver', () => {
  assert.match(card, /<SymbolView name="bell" size=\{20\} tintColor=\{colors\.label\} \/>/);
  assert.match(card, /title: \{[^}]*fontSize: 15,[^}]*fontWeight: '600',/);
  assert.match(card, /padding: 16/);
  assert.match(card, /borderRadius: 12/);
  assert.match(card, /accessibilityLabel=\{s\.reminderCardTitle\}/);
  assert.equal((card.match(/accessibilityRole="button"/g) ?? []).length, 2);
  assert.match(card, /text: \{\s*minHeight: 44,\s*minWidth: 44,/);
});

test('UX2-130 (ux): empty chat shows the same card 24 pt under the empty state, upright and after it', () => {
  const at = room.indexOf('ListEmptyComponent={');
  const empty = room.slice(at, room.indexOf('renderItem=', at));
  assert.ok(empty.indexOf('<EmptyState') < empty.indexOf('<ReminderCard'), 'card after the empty state');
  assert.match(empty, /<View style=\{styles\.emptyWrap\}>[\s\S]*<ReminderCard[\s\S]*<\/View>\s*\}/);
  assert.match(empty, /reminderCard\.shown \?/);
  assert.match(empty, /busy=\{reminderCard\.busy\} onTurnOn=\{reminderCard\.turnOn\} onNotNow=\{reminderCard\.notNow\}/);
  // The wrap is flipped back once for the inverted list; the card adds no flip of its own.
  assert.match(room, /emptyWrap: \{[^}]*transform: \[\{ scaleY: -1 \}\]/);
  assert.doesNotMatch(card, /scaleY/);
  assert.match(room, /emptyReminder: \{ alignSelf: 'stretch', marginTop: 16 \}/);
  assert.match(card, /marginVertical: 8,/);
  // One hook state for both slots, so "Not now" hides both.
  assert.equal((room.match(/useReminderCard\(/g) ?? []).length, 1);
  assert.equal((room.match(/<ReminderCard /g) ?? []).length, 2);
});
