import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

const m = await import('../src/features/calendar/day/day-detail-model.ts');
const TZ = 'America/Los_Angeles';
const room = (o = {}) => ({
  roomId: 'r1', name: 'Morning Run', start: '2026-11-18', end: '2026-11-18', endAt: '2026-11-18T16:30:00Z',
  startsAt: '2026-11-18T15:30:00Z', placeName: 'Exposition Park', people: 4, hero: 'run', ...o,
});

test('dayTitle', () => {
  assert.equal(m.dayTitle('2026-11-18'), 'Wed, Nov 18');
  assert.equal(m.dayTitle('2026-11-18', true), 'Wednesday, November 18');
});

test('dayRooms: covers the day, ordered by start; dayEvents: all day first then by time', () => {
  const rooms = { a: room({ roomId: 'a', name: 'B', startsAt: '2026-11-18T20:00:00Z' }), b: room({ roomId: 'b', name: 'A' }), c: room({ roomId: 'c', start: '2026-11-19', end: '2026-11-19' }) };
  assert.deepEqual(m.dayRooms(rooms, '2026-11-18').map((r) => r.roomId), ['b', 'a']);
  const ev = [
    { id: '1', title: 'Late', start: '2026-11-18', end: '2026-11-18', emoji: 'x', startTime: '19:00', endTime: '21:00' },
    { id: '2', title: 'Allday', start: '2026-11-17', end: '2026-11-19', emoji: 'x' },
  ];
  assert.deepEqual(m.dayEvents(ev, '2026-11-18').map((e) => e.id), ['2', '1']);
  assert.equal(m.dayEvents(ev, '2026-11-20').length, 0);
});

test('meta: time range, ended-only, blank parts dropped; spoken form', () => {
  assert.equal(m.roomTime(room(), TZ), '7:30 AM – 8:30 AM');
  assert.equal(m.roomTimeSpoken(room(), TZ), '7:30 AM to 8:30 AM');
  assert.equal(m.roomTime(room({ startsAt: null, endAt: '2026-11-19T05:40:00Z' }), TZ), 'Ended 9:40 PM');
  assert.equal(m.roomPlace(room({ placeName: '  ' })), null);
  assert.equal(m.roomPlace(room()), 'Exposition Park');
});

test('recapState: pending, wait, upsell, failed, ready', () => {
  const now = Date.parse('2026-11-19T00:00:00Z');
  const past = room();
  assert.equal(m.recapState(room({ endAt: '2026-11-20T00:00:00Z', end: '2026-11-19' }), now, true), 'pending');
  assert.equal(m.recapState(past, now, null), 'wait');
  assert.equal(m.recapState({ ...past, diary: ['x'] }, now, false), 'upsell');
  assert.equal(m.recapState({ ...past, diary: null }, now, true), 'failed');
  assert.equal(m.recapState({ ...past, diary: [] }, now, true), 'failed');
  assert.equal(m.recapState({ ...past, diary: ['x'] }, now, true), 'ready');
});

test('metPeople hides under 2 or unknown', () => {
  assert.equal(m.metPeople(null), null);
  assert.equal(m.metPeople(1), null);
  assert.equal(m.metPeople(2), 'You met 1 person');
  assert.equal(m.metPeople(5), 'You met 4 people');
});

test('addNextLabel by topic', () => {
  assert.equal(m.addNextLabel('run'), 'Add next run to my calendar');
  assert.equal(m.addNextLabel('sports'), 'Add next game to my calendar');
  assert.equal(m.addNextLabel('study'), 'Add next study session to my calendar');
  assert.equal(m.addNextLabel('general'), 'Add the next one to my calendar');
  assert.equal(m.addNextLabel(undefined), 'Add the next one to my calendar');
});

test('addNextParams: +7 days, room times, all day when unknown', () => {
  assert.deepEqual(m.addNextParams(room(), 'R', TZ), { title: 'Morning Run', start: '2026-11-25', end: '2026-11-25', emoji: 'R', startTime: '07:30', endTime: '08:30' });
  assert.deepEqual(m.addNextParams(room({ startsAt: null }), 'R', TZ), { title: 'Morning Run', start: '2026-11-25', end: '2026-11-25', emoji: 'R' });
});

test('eventTimeText', () => {
  assert.equal(m.eventTimeText({}), 'All day');
  assert.equal(m.eventTimeText({ startTime: '19:00', endTime: '21:00' }), '7:00 PM – 9:00 PM');
});

test('recapSpoken: the recap card reads as one sentence; upsell and wait stay off', () => {
  assert.equal(m.recapSpoken('ready', 3, ['Met at noon', 'Booked a court.']), 'Trok Recap. You met 2 people. Met at noon. Booked a court.');
  assert.equal(m.recapSpoken('pending', null, null), 'Trok Recap. Your recap appears after this room ends.');
  assert.equal(m.recapSpoken('failed', null, null), 'Trok Recap. No recap was saved for this room.');
  assert.equal(m.recapSpoken('upsell', 3, ['x']), null);
  assert.equal(m.recapSpoken('wait', null, null), null);
});

test('roomTime: a live room says when it ends from the device today; an ended room says Ended', () => {
  const at = (iso) => Date.parse(iso);
  const nov15 = at('2026-11-15T20:00:00Z'); // Nov 15 noon PST, the device's today
  const r = (endAt) => room({ startsAt: null, endAt });
  assert.equal(m.roomTime(r('2026-11-16T08:27:00Z'), TZ, nov15), 'Ends tomorrow at 12:27 AM'); // viewing Nov 14, ends Nov 16 00:27 PST
  assert.equal(m.roomTime(r('2026-11-18T08:27:00Z'), TZ, nov15), 'Ends Wed, Nov 18 at 12:27 AM');
  assert.equal(m.roomTime(r('2026-11-16T05:30:00Z'), TZ, at('2026-11-15T20:00:00Z')), 'Ends today at 9:30 PM');
  assert.equal(m.roomTimeSpoken(r('2026-11-18T08:27:00Z'), TZ, nov15), 'Ends Wed, Nov 18 at 12:27 AM');
  assert.equal(m.roomTime(r('2026-11-18T08:27:00Z'), TZ, at('2026-11-19T20:00:00Z')), 'Ended 12:27 AM');
});
