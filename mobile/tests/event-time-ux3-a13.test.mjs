// Run: npm test. UX3-A13: a personal event has a start and end time unless it is all day.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const d = await import('../src/features/calendar/calendar-data.ts');
const f = await import('../src/features/calendar/calendar-format.ts');
const ev = (over = {}) => ({ title: 'Run', start: '2026-11-20', end: '2026-11-20', emoji: '🏃', ...over });

test('isTimeKey accepts 24 h HH:MM only', () => {
  for (const ok of ['00:00', '09:30', '23:59']) assert.equal(d.isTimeKey(ok), true, ok);
  for (const bad of ['24:00', '9:30', '12:60', '12:00:00', '', null, 930]) assert.equal(d.isTimeKey(bad), false, String(bad));
});

test('checkEvent: times come as a valid pair, and the end is not before the start on one day', () => {
  assert.equal(d.checkEvent(ev({ startTime: '09:00', endTime: '10:00' })), null);
  assert.equal(d.checkEvent(ev({ startTime: '09:00', endTime: '09:00' })), null);
  assert.equal(d.checkEvent(ev({ startTime: '09:00' })), 'dates');
  assert.equal(d.checkEvent(ev({ startTime: '9am', endTime: '10:00' })), 'dates');
  assert.equal(d.checkEvent(ev({ startTime: '10:00', endTime: '09:00' })), 'order');
  assert.equal(d.checkEvent(ev({ end: '2026-11-21', startTime: '23:00', endTime: '01:00' })), null);
  assert.equal(d.checkEvent(ev()), null);
});

test('upsertEvent stores the times, and all day stores none', () => {
  let doc = d.upsertEvent(d.emptyDoc(), 'e1', ev({ startTime: '18:00', endTime: '19:00' }));
  assert.deepEqual([doc.events[0].startTime, doc.events[0].endTime], ['18:00', '19:00']);
  doc = d.upsertEvent(doc, 'e1', ev());
  assert.equal('startTime' in doc.events[0], false);
  assert.equal('endTime' in doc.events[0], false);
});

test('a stored event keeps a valid time pair; a broken pair reads as all day; old events still read', () => {
  const read = (e) => d.parseDoc(JSON.stringify({ version: 1, rooms: {}, events: [{ id: 'a', ...ev(), ...e }] })).events[0];
  assert.deepEqual([read({ startTime: '07:00', endTime: '08:30' }).startTime, read({ startTime: '07:00', endTime: '08:30' }).endTime], ['07:00', '08:30']);
  for (const broken of [{ startTime: '07:00' }, { startTime: '25:00', endTime: '08:00' }, { startTime: '09:00', endTime: '08:00' }]) {
    const e = read(broken);
    assert.equal(e.startTime, undefined);
    assert.equal(e.endTime, undefined);
    assert.equal(e.title, 'Run');
  }
  assert.equal(read({}).startTime, undefined);
});

test('editor defaults: next full hour, one hour long, crossing midnight moves the end date', () => {
  const at = (s) => new Date(s);
  assert.deepEqual(f.defaultEventTimes(at('2026-11-20T09:15:00')), { start: '2026-11-20', startTime: '10:00', end: '2026-11-20', endTime: '11:00' });
  assert.deepEqual(f.defaultEventTimes(at('2026-11-20T10:00:00')), { start: '2026-11-20', startTime: '11:00', end: '2026-11-20', endTime: '12:00' });
  assert.deepEqual(f.defaultEventTimes(at('2026-11-20T22:40:00')), { start: '2026-11-20', startTime: '23:00', end: '2026-11-21', endTime: '00:00' });
  assert.deepEqual(f.defaultEventTimes(at('2026-11-20T23:05:00')), { start: '2026-11-21', startTime: '00:00', end: '2026-11-21', endTime: '01:00' });
});

test('date + time round-trip through a local Date', () => {
  const dt = f.keyTimeToLocalDate('2026-11-20', '18:45');
  assert.deepEqual([dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes()], [2026, 10, 20, 18, 45]);
  assert.deepEqual(f.localDateToKeyTime(dt), { date: '2026-11-20', time: '18:45' });
  assert.equal(f.keyTimeToLocalDate('2026-11-20').getHours(), 12);
});

test('editor: All day switch, date+time pickers when timed, times saved only when not all day', () => {
  const src = readFileSync(new URL('../src/features/calendar/event-editor.tsx', import.meta.url), 'utf8');
  assert.match(src, /<InkSwitch[^>]*value=\{allDay\}/s);
  assert.match(src, /displayedComponents=\{allDay \? \['date'\] : \['date', 'hourAndMinute'\]\}/);
  assert.match(src, /allDay \? \{ title, start, end, emoji \} : \{ title, start, end, emoji, startTime, endTime \}/);
  // Existing events without a time, and Qrewing's date-only picks, open as all day.
  assert.match(src, /existing \? !existing\.startTime : params\.ask === '1'/);
});
