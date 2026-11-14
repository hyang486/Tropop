// Run: npm test. UX3-B04: day separators, collapsed system-line runs, "is OK now" copy.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { buildTimeline, resolvedCopy, dayLabel, runSummary } = await import('../src/features/chat/chat-timeline-plan.ts');
const { en } = await import('../src/i18n/en.ts');
const copy = en.chat.timeline;

const NOW = new Date(2026, 10, 14, 12, 0).getTime();
const at = (dayOffset, h, m = 0) => new Date(2026, 10, 14 + dayOffset, h, m).toISOString();
let n = 0;
const msg = (kind, body, sender, when) => ({ type: 'message', item: { id: `m${++n}`, kind, body, sender_id: sender, created_at: when } });
const opts = (extra = {}) => ({
  nowMs: NOW,
  openEmergencyUsers: new Set(),
  expanded: new Set(),
  formatDay: () => 'Wed, Nov 12',
  lineText: (i) => resolvedCopy(i.body ?? '', copy),
  copy,
  ...extra,
});
const shape = (rows) => rows.map((r) => (r.type === 'message' ? r.item.body : r.type === 'day' ? `[${r.label}]` : r.type === 'sysrun' ? `{${r.summary}}` : 'hidden'));

test('resolved copy drops the parenthetical, keeps the status', () => {
  assert.equal(resolvedCopy('Sora is OK (Emergency resolved)', copy), 'Sora is OK now');
  assert.equal(resolvedCopy('Sora is OK (Emergency resolved) · Giving up', copy), 'Sora is OK now · Giving up');
  assert.equal(resolvedCopy('Sora: Resting', copy), 'Sora: Resting');
});

test('day labels', () => {
  assert.equal(dayLabel(NOW - 3600e3, NOW, () => 'x', copy), 'Today');
  assert.equal(dayLabel(NOW - 86400e3, NOW, () => 'x', copy), 'Yesterday');
  assert.equal(dayLabel(NOW - 3 * 86400e3, NOW, () => 'Wed, Nov 11', copy), 'Wed, Nov 11');
});

test('3+ flips collapse; 2 do not; a text breaks the run; days get separators (newest first)', () => {
  const rows = [
    msg('text', 'hi', 'a', at(0, 11)),
    msg('status', 'Sora is OK (Emergency resolved)', 's', at(0, 10, 4)),
    msg('emergency', 'Sora needs help (Emergency)', 's', at(0, 10, 3)),
    msg('status', 'Sora is OK (Emergency resolved)', 's', at(0, 10, 2)),
    msg('emergency', 'Sora needs help (Emergency)', 's', at(0, 10, 1)),
    msg('text', 'yo', 'b', at(-1, 9)),
    msg('arrival', 'Jun arrived', 'j', at(-1, 8, 2)),
    msg('arrival', 'Bo arrived', 'b', at(-1, 8, 1)),
  ];
  assert.deepEqual(shape(buildTimeline(rows, opts())), [
    'hi',
    '{Sora set Emergency and is OK now · 2 times}',
    '[Today]',
    'yo',
    'Jun arrived',
    'Bo arrived',
    '[Yesterday]',
  ]);
});

test('joins combine; a run never spans days; Show expands it', () => {
  const rows = [
    msg('system', 'Jun joined', 'j', at(0, 9, 3)),
    msg('system', 'Sora joined', 's', at(0, 9, 2)),
    msg('system', 'Bo joined', 'b', at(0, 9, 1)),
    msg('system', 'Ari joined', 'a', at(-2, 9)),
  ];
  const out = buildTimeline(rows, opts());
  assert.deepEqual(shape(out), ['{Bo, Sora and Jun joined}', '[Today]', 'Ari joined', '[Wed, Nov 12]']);
  const key = out[0].key;
  assert.deepEqual(shape(buildTimeline(rows, opts({ expanded: new Set([key]) }))).slice(0, 3), ['Jun joined', 'Sora joined', 'Bo joined']);
});

test('an open Emergency line is never collapsed and splits the run', () => {
  const rows = [
    msg('emergency', 'Sora needs help (Emergency)', 's', at(0, 10, 5)),
    msg('arrival', 'Jun arrived', 'j', at(0, 10, 4)),
    msg('arrival', 'Bo arrived', 'b', at(0, 10, 3)),
    msg('arrival', 'Ari arrived', 'a', at(0, 10, 2)),
  ];
  const out = shape(buildTimeline(rows, opts({ openEmergencyUsers: new Set(['s']) })));
  assert.deepEqual(out, ['Sora needs help (Emergency)', '{Jun arrived · 2 more}', '[Today]']);
  // Closed: all four collapse.
  assert.equal(buildTimeline(rows, opts()).filter((r) => r.type === 'sysrun').length, 1);
});

test('activity started stays; mixed summary; 4+ joins say "others"', () => {
  const started = 'Activity started. Open Map to share your location.';
  const rows = [msg('arrival', 'A arrived', 'a', at(0, 9, 4)), msg('system', started, 'h', at(0, 9, 3)), msg('arrival', 'B arrived', 'b', at(0, 9, 2))];
  assert.equal(buildTimeline(rows, opts()).filter((r) => r.type === 'sysrun').length, 0);
  const joins = ['A', 'B', 'C', 'D'].map((x, i) => ({ id: x, kind: 'system', body: `${x} joined`, sender_id: x, created_at: at(0, 9, 9 - i) }));
  assert.equal(runSummary(joins, () => '', copy), 'D, C and 2 others joined');
});
