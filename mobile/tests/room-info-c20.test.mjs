// Run: npm test. ux audit C20 (2026-11-14): Room info P2 polish.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('UX2-53: the host sees no "Qrewing AI" header over the switch row; members and the offline state keep it', () => {
  const src = read('../src/features/event/info-section.tsx');
  assert.match(src, /\{isHost \? null : <QLabel>\{s\.section\}<\/QLabel>\}/);
  // Offline (host only) keeps the header: there is no switch row to name the section.
  assert.match(src, /<QLabel>\{s\.section\}<\/QLabel>\s*<Hint tone="error">\{s\.loadFailed\}/);
  assert.equal((src.match(/<QLabel>\{s\.section\}<\/QLabel>/g) ?? []).length, 2);
});

test('UX2-57: the Room info host footer gets the 0.5 pt top separator, as Create room', () => {
  const info = read('../src/app/room/[id]/info.tsx');
  assert.match(info, /actionsDivider=\{isHost\}/);
  const q = read('../src/components/q-screen.tsx');
  assert.match(q, /actionsDivider = false,/);
  assert.match(q, /actionsDivider: \{ borderTopWidth: StyleSheet\.hairlineWidth, borderTopColor: colors\.separator \}/);
  assert.match(q, /actionsDivider && styles\.actionsDivider/);
  assert.match(read('../src/app/create-room.tsx'), /borderTopWidth: StyleSheet\.hairlineWidth, borderTopColor: colors\.separator/);
});
