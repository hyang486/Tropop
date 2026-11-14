// Run: npm test. #1 / #12: who has seen an Emergency, and one vibration per Emergency across screens.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAnnouncer, emergencyBarMode, seenSummary } from '../src/lib/emergency-plan.ts';

const names = new Map([
  ['u1', 'Mina'],
  ['u2', 'Joon'],
]);

test('seenSummary names current members and counts only them', () => {
  assert.deepEqual(seenSummary(new Set(['u1', 'u2']), names), { who: ['Mina', 'Joon'], seen: 2 });
});

test('seenSummary leaves out a member who left, in the names and the count', () => {
  assert.deepEqual(seenSummary(new Set(['u1', 'gone']), names), { who: ['Mina'], seen: 1 });
});

test('seenSummary with no acks', () => {
  assert.deepEqual(seenSummary(new Set(), names), { who: [], seen: 0 });
});

test('announcer: seeded ids are never announced', () => {
  const a = createAnnouncer();
  a.seed(['e1']);
  assert.deepEqual(a.fresh(['e1']), []);
});

test('announcer: a new Emergency is announced once, however many screens see it', () => {
  const a = createAnnouncer();
  a.seed([]); // chat screen first load
  a.seed([]); // map screen first load
  assert.deepEqual(a.fresh(['e2']), ['e2']); // chat sees it first
  assert.deepEqual(a.fresh(['e2']), []); // map sees the same one
});

test('announcer: a screen opened after the alert does not re-announce it', () => {
  const a = createAnnouncer();
  assert.deepEqual(a.fresh(['e3']), ['e3']);
  a.seed(['e3']);
  assert.deepEqual(a.fresh(['e3']), []);
});

test('emergencyBarMode: chat shows the bar until I see it, then the line', () => {
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: false, expanded: false }), 'bar');
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: true, expanded: false }), 'line');
});

test('emergencyBarMode: my own Emergency keeps the bar in chat, the line elsewhere', () => {
  assert.equal(emergencyBarMode({ place: 'chat', mine: true, acked: false, expanded: false }), 'bar');
  assert.equal(emergencyBarMode({ place: 'other', mine: true, acked: false, expanded: false }), 'line');
});

test('emergencyBarMode: Map, Photos and Info show the line, Open expands it', () => {
  assert.equal(emergencyBarMode({ place: 'other', mine: false, acked: false, expanded: false }), 'line');
  assert.equal(emergencyBarMode({ place: 'other', mine: false, acked: true, expanded: true }), 'bar');
  assert.equal(emergencyBarMode({ place: 'chat', mine: false, acked: true, expanded: true }), 'bar');
});

test('UX2-05: a failed Emergency read shows the error, never an empty "no Emergency" area', async () => {
  const { emergencyAreaMode } = await import('../src/lib/emergency-plan.ts');
  const { en } = await import('../src/i18n/en.ts');
  assert.equal(emergencyAreaMode({ loading: true, error: null, count: 0 }), 'none');
  assert.equal(emergencyAreaMode({ loading: false, error: null, count: 0 }), 'none');
  assert.equal(emergencyAreaMode({ loading: false, error: null, count: 2 }), 'list');
  assert.equal(emergencyAreaMode({ loading: false, error: new Error('offline'), count: 0 }), 'failed');
  assert.equal(emergencyAreaMode({ loading: false, error: new Error('offline'), count: 1 }), 'failed');
  assert.equal(en.activity.readFailed, "Can't check for Emergencies. Try again.");
  assert.equal(en.activity.readRetry, 'Try again');
});

test('UX2-05b: the status picker always offers Emergency first; Clear only for a known, set status', async () => {
  const { statusPickerPlan } = await import('../src/lib/emergency-plan.ts');
  const ok = { id: 'ok', is_emergency: false };
  const em = { id: 'em', is_emergency: true };
  // Failed with no cache: the built-in Emergency tile, no Clear, the error line.
  assert.deepEqual(statusPickerPlan({ statuses: [], currentId: undefined, failed: true }), {
    emergency: 'builtin',
    others: [],
    showClear: false,
    showError: true,
  });
  // Server order puts Emergency last; the picker puts it first.
  const p = statusPickerPlan({ statuses: [ok, em], currentId: 'ok', failed: false });
  assert.equal(p.emergency, em);
  assert.deepEqual(p.others, [ok]);
  assert.equal(p.showClear, true);
  assert.equal(p.showError, false);
  // No current status, or one not in the list (unknown): no Clear.
  assert.equal(statusPickerPlan({ statuses: [ok, em], currentId: undefined, failed: false }).showClear, false);
  assert.equal(statusPickerPlan({ statuses: [ok, em], currentId: 'gone', failed: true }).showClear, false);
});

test('UX2-05b: Emergency resolves its id without the list and a failed send offers Try again', async () => {
  const { readFileSync } = await import('node:fs');
  const { en } = await import('../src/i18n/en.ts');
  const activity = readFileSync(new URL('../src/lib/activity.ts', import.meta.url), 'utf8');
  const set = activity.slice(activity.indexOf('const setEmergency'), activity.indexOf('const clearStatus'));
  assert.match(set, /statusCache\.get\(roomId\)/);
  assert.match(set, /\.eq\('is_emergency', true\)/);
  assert.match(set, /rpc\('set_my_status'/);
  const picker = readFileSync(new URL('../src/components/status-picker.tsx', import.meta.url), 'utf8');
  const confirm = picker.slice(picker.indexOf('export function confirmEmergency'), picker.indexOf('export function StatusPicker'));
  assert.match(confirm, /en\.activity\.emergencyNotSent/);
  assert.match(confirm, /isPreferred: true, onPress: \(\) => void attempt\(\)/);
  for (const f of ['../src/features/chat/plus-panel.tsx', '../src/features/pace/pace-layer.tsx']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.match(src, /onEmergency=\{emergency\}/, f);
    assert.match(src, /confirmEmergency\(/, f);
    assert.doesNotMatch(src, /emergencyConfirmTitle/, f);
  }
  assert.equal(en.activity.statusesFailed, "Couldn't load statuses.");
  assert.equal(en.activity.emergencyTileA11y, 'Emergency, alerts everyone in the room');
  assert.equal(en.activity.emergencyNotSent, 'Emergency not sent');
});
