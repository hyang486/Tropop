// Run: npm test. UX3-B08: shared media inline in chat (line ↔ media matching and tile layout).
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { mediaForLines, mediaLayout, singleSize, GRID_TILE } = await import('../src/features/chat/chat-media-plan.ts');

const line = (id, sender, t, kind = 'media') => ({ id, kind, sender_id: sender, created_at: `2026-11-14T10:${t}:00Z` });
const item = (id, up, t, kind = 'photo') => ({ id, uploader_id: up, created_at: `2026-11-14T10:${t}:00Z`, kind });

test('each media line takes the uploader items since their previous media line', () => {
  const lines = [line('L2', 'a', '20'), line('L1', 'a', '10'), line('T', 'a', '15', 'text'), line('Lb', 'b', '12')];
  const media = [item('m1', 'a', '05'), item('m2', 'a', '10'), item('m3', 'a', '18'), item('m4', 'b', '11'), item('m5', 'a', '25')];
  const out = mediaForLines(lines, media);
  assert.deepEqual(out.get('L1').map((m) => m.id), ['m1', 'm2']);
  assert.deepEqual(out.get('L2').map((m) => m.id), ['m3']);
  assert.deepEqual(out.get('Lb').map((m) => m.id), ['m4']);
  assert.equal(out.has('T'), false);
});

test('a line whose items were deleted has no entry (plain text fallback)', () => {
  assert.equal(mediaForLines([line('L', 'a', '10')], []).has('L'), false);
  assert.equal(mediaForLines([{ ...line('S', null, '10') }], [item('m', 'a', '05')]).size, 0);
});

test('layout: single, 2×2 grid with +N, files apart', () => {
  const six = ['1', '2', '3', '4', '5', '6'].map((n) => item(n, 'a', '01'));
  const l = mediaLayout([...six, item('f', 'a', '01', 'file')]);
  assert.equal(l.tiles.length, 4);
  assert.equal(l.more, 2);
  assert.deepEqual(l.files.map((m) => m.id), ['f']);
  assert.equal(l.single, false);
  assert.equal(mediaLayout([item('x', 'a', '01')]).single, true);
  assert.equal(GRID_TILE, 99);
});

test('single size keeps aspect, caps height, squares unknown', () => {
  assert.deepEqual(singleSize(400, 300), { width: 220, height: 165 });
  assert.deepEqual(singleSize(300, 900), { width: 220, height: 280 });
  assert.deepEqual(singleSize(null, 10), { width: 220, height: 220 });
});

test('paged chat: the first loaded line per sender stops at the oldest loaded message', () => {
  // Loaded page starts at 10:30 (older lines, incl. a's 10:20 line for m1, are not loaded).
  const lines = [line('T', 'b', '30', 'text'), line('L', 'a', '40')];
  const media = [item('m1', 'a', '15'), item('m2', 'a', '35')];
  assert.deepEqual(mediaForLines(lines, media, true).get('L').map((m) => m.id), ['m2']);
  // All history loaded: the same line takes both.
  assert.deepEqual(mediaForLines(lines, media, false).get('L').map((m) => m.id), ['m1', 'm2']);
  // The oldest loaded message is the media line itself: no match, plain text.
  assert.equal(mediaForLines([line('L', 'a', '40')], media, true).has('L'), false);
});
