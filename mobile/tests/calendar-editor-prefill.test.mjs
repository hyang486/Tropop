// Run: npm test. /calendar-event params → new-event form prefill (Calendar v2 day detail + ask=1).
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { editorPrefill } = await import('../src/features/calendar/editor-prefill.ts');
const fresh = { start: '2026-11-15', startTime: '14:00', end: '2026-11-15', endTime: '15:00' };
const lateFresh = { start: '2026-11-15', startTime: '23:00', end: '2026-11-16', endTime: '00:00' };

test('no params: today at the default times, timed, empty title', () => {
  assert.deepEqual(editorPrefill({}, fresh), { title: '', ...fresh, allDay: false, emoji: undefined });
});

test('ask=1 stays all day and ignores times', () => {
  const r = editorPrefill({ ask: '1', title: 'Dinner', start: '2026-11-20', end: '2026-11-20', emoji: '🍽️', startTime: '18:00', endTime: '19:00' }, fresh);
  assert.equal(r.allDay, true);
  assert.equal(r.startTime, '14:00');
  assert.equal(r.endTime, '15:00');
  assert.deepEqual([r.title, r.start, r.end, r.emoji], ['Dinner', '2026-11-20', '2026-11-20', '🍽️']);
});

test('day-detail copy with both times opens timed with those times', () => {
  const r = editorPrefill({ title: 'Run', start: '2026-11-21', end: '2026-11-21', emoji: '🏃', startTime: '07:30', endTime: '08:15' }, fresh);
  assert.deepEqual(r, { title: 'Run', start: '2026-11-21', end: '2026-11-21', allDay: false, startTime: '07:30', endTime: '08:15', emoji: '🏃' });
});

test('day-detail copy without times opens all day', () => {
  const r = editorPrefill({ title: 'Trip', start: '2026-11-21', end: '2026-11-23' }, fresh);
  assert.equal(r.allDay, true);
  assert.deepEqual([r.start, r.end], ['2026-11-21', '2026-11-23']);
});

test('one time, or a bad time, is ignored (both or none) and opens all day', () => {
  for (const t of [{ startTime: '07:30' }, { startTime: '07:30', endTime: '25:00' }, { startTime: '7:30', endTime: '08:00' }]) {
    const r = editorPrefill({ start: '2026-11-21', end: '2026-11-21', ...t }, fresh);
    assert.equal(r.allDay, true);
    assert.deepEqual([r.startTime, r.endTime], ['14:00', '15:00']);
  }
});

test('start without a valid end ends the same day', () => {
  assert.equal(editorPrefill({ start: '2026-11-21', end: 'nope' }, fresh).end, '2026-11-21');
});

test('date: that day at the default times, timed', () => {
  const r = editorPrefill({ date: '2026-12-02' }, fresh);
  assert.deepEqual(r, { title: '', start: '2026-12-02', end: '2026-12-02', allDay: false, startTime: '14:00', endTime: '15:00', emoji: undefined });
});

test('date keeps a default hour that crosses midnight', () => {
  const r = editorPrefill({ date: '2026-12-31' }, lateFresh);
  assert.deepEqual([r.start, r.end, r.startTime, r.endTime], ['2026-12-31', '2027-01-01', '23:00', '00:00']);
});

test('a bad date or start falls back to the defaults; start wins over date', () => {
  assert.deepEqual([editorPrefill({ date: '2026-13-01' }, fresh).start, editorPrefill({ start: 'x' }, fresh).start], ['2026-11-15', '2026-11-15']);
  assert.equal(editorPrefill({ date: '2026-12-02', start: '2026-12-05' }, fresh).start, '2026-12-05');
});
