// Run: npm test. Local 24-hour expiry reminder planning.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planReminders, reminderId, REMINDER_WINDOW_MS } from '../src/lib/expiry-plan.ts';

const NOW = Date.parse('2026-11-05T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const room = (id, expiresInMs, version = 1) => ({
  id,
  name: `Room ${id}`,
  expires_at: new Date(NOW + expiresInMs).toISOString(),
  expiry_version: version,
});
const scheduledFor = (r) => ({
  identifier: reminderId(r.id),
  data: { kind: 'expiry', roomId: r.id, expiryVersion: r.expiry_version, expiresAt: r.expires_at },
});

test('schedules at expires_at - 24h for a room with more than 24h left', () => {
  const r = room('a', 30 * HOUR);
  const plan = planReminders([r], [], NOW, true);
  assert.deepEqual(plan.cancel, []);
  assert.equal(plan.schedule.length, 1);
  assert.equal(plan.schedule[0].identifier, 'expiry-a');
  assert.equal(plan.schedule[0].fireAt, NOW + 30 * HOUR - REMINDER_WINDOW_MS);
});

test('leaves an identical reminder alone (no reschedule on every load)', () => {
  const r = room('a', 30 * HOUR);
  const plan = planReminders([r], [scheduledFor(r)], NOW, true);
  assert.deepEqual(plan, { schedule: [], cancel: [] });
});

test('host changes the expiry: new version replaces the old reminder', () => {
  const old = room('a', 30 * HOUR, 1);
  const moved = room('a', 40 * HOUR, 2);
  const plan = planReminders([moved], [scheduledFor(old)], NOW, false);
  assert.equal(plan.schedule.length, 1);
  assert.equal(plan.schedule[0].fireAt, NOW + 40 * HOUR - REMINDER_WINDOW_MS);
});

test('expiry moved inside 24h: the pending reminder is cancelled, nothing scheduled', () => {
  const old = room('a', 30 * HOUR, 1);
  const moved = room('a', 10 * HOUR, 2);
  const plan = planReminders([moved], [scheduledFor(old)], NOW, false);
  assert.deepEqual(plan, { schedule: [], cancel: ['expiry-a'] });
});

test('room with less than 24h left (late joiner): no local schedule', () => {
  assert.deepEqual(planReminders([room('a', 5 * HOUR)], [], NOW, true), { schedule: [], cancel: [] });
});

test('complete list: reminders for rooms no longer listed (left, ended) are cancelled', () => {
  const kept = room('a', 30 * HOUR);
  const left = room('b', 30 * HOUR);
  const plan = planReminders([kept], [scheduledFor(kept), scheduledFor(left), { identifier: 'other', data: null }], NOW, true);
  assert.deepEqual(plan, { schedule: [], cancel: ['expiry-b'] });
});

test('partial list (one room screen) never cancels other rooms', () => {
  const a = room('a', 30 * HOUR);
  const b = room('b', 30 * HOUR);
  assert.deepEqual(planReminders([a], [scheduledFor(a), scheduledFor(b)], NOW, false), { schedule: [], cancel: [] });
});

test('one second before the 24h mark still schedules; at the mark it does not', () => {
  assert.equal(planReminders([room('a', REMINDER_WINDOW_MS + 1000)], [], NOW, true).schedule.length, 1);
  assert.equal(planReminders([room('a', REMINDER_WINDOW_MS)], [], NOW, true).schedule.length, 0);
});

// Running-crew #9: in-room "Room ends soon" banner window.
import { endsSoonWindowMs, showEndsSoon, SHORT_ROOM_BANNER_MS } from '../src/lib/expiry-plan.ts';

const iso = (ms) => new Date(ms).toISOString();

test('a 3 h room shows the banner only in the last hour', () => {
  const created = NOW;
  const expires = NOW + 3 * HOUR;
  assert.equal(endsSoonWindowMs(iso(created), iso(expires)), SHORT_ROOM_BANNER_MS);
  assert.equal(showEndsSoon(iso(created), iso(expires), created + 1000), false);
  assert.equal(showEndsSoon(iso(created), iso(expires), expires - HOUR - 1000), false);
  assert.equal(showEndsSoon(iso(created), iso(expires), expires - HOUR + 1000), true);
  assert.equal(showEndsSoon(iso(created), iso(expires), expires - 1000), true);
});

test('a 1 day room keeps the 24 h window, even when created_at is a little later than the client time', () => {
  const expires = NOW + 24 * HOUR;
  assert.equal(endsSoonWindowMs(iso(NOW), iso(expires)), REMINDER_WINDOW_MS);
  assert.equal(endsSoonWindowMs(iso(NOW + 3000), iso(expires)), REMINDER_WINDOW_MS);
  assert.equal(showEndsSoon(iso(NOW + 3000), iso(expires), NOW + 5000), true);
});

test('longer rooms show the banner in the last 24 h only', () => {
  const expires = NOW + 96 * HOUR;
  assert.equal(showEndsSoon(iso(NOW), iso(expires), expires - 25 * HOUR), false);
  assert.equal(showEndsSoon(iso(NOW), iso(expires), expires - 23 * HOUR), true);
});

test('an ended room or bad dates show no banner', () => {
  const expires = NOW + 3 * HOUR;
  assert.equal(showEndsSoon(iso(NOW), iso(expires), expires), false);
  assert.equal(showEndsSoon(iso(NOW), iso(expires), expires + HOUR), false);
  assert.equal(showEndsSoon('not a date', iso(expires), expires - 1000), true);
  assert.equal(showEndsSoon(iso(NOW), 'not a date', NOW), false);
});
