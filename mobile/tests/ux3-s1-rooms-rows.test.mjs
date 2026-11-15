// Run: npm test. UX3-A01 (audit-3 batch 3, S1): Rooms rows show the last item, unread pill, time and Live.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const m = await import('../src/features/event/room-summary.ts');
const { en } = await import('../src/i18n/en.ts');
const { chatLine } = await import('../src/lib/chat-line.ts');

const base = { room_id: 'r', last_kind: 'text', last_body: 'Running 5 min late', last_sender_id: 'jun', last_sender_name: 'Jun', last_at: '2026-11-14T09:38:00', unread: 3 };

test('line 2: message, own, photos, arrival, Emergency (danger only there), empty', () => {
  assert.deepEqual(m.lastItemLine(base, 'me', en, chatLine), { text: 'Jun: Running 5 min late', danger: false });
  assert.equal(m.lastItemLine({ ...base, last_sender_id: 'me' }, 'me', en, chatLine).text, 'You: Running 5 min late');
  assert.equal(m.lastItemLine({ ...base, last_kind: 'text', last_body: 'a\nb' }, 'me', en, chatLine).text, 'Jun: a b');
  assert.equal(m.lastItemLine({ ...base, last_kind: 'media', last_body: 'shared 3 photos' }, 'me', en, chatLine).text, 'Jun shared 3 photos');
  assert.equal(m.lastItemLine({ ...base, last_kind: 'arrival', last_body: 'Sora arrived' }, 'me', en, chatLine).text, 'Sora arrived');
  assert.deepEqual(m.lastItemLine({ ...base, last_kind: 'emergency', last_body: 'Sora needs help (Emergency)' }, 'me', en, chatLine), { text: 'Sora set Emergency', danger: true });
  assert.equal(m.lastItemLine({ ...base, last_kind: 'status', last_body: 'Sora: Running late' }, 'me', en, chatLine).danger, false);
  assert.deepEqual(m.lastItemLine({ ...base, last_kind: null, last_body: null, last_at: null, unread: 0 }, 'me', en, chatLine), { text: 'No messages yet', danger: false });
  assert.equal(m.lastItemLine(undefined, 'me', en, chatLine).text, 'No messages yet');
});

test('trailing time: 9:38 today, Yesterday, weekday, then Nov 2', () => {
  const now = new Date(2026, 10, 14, 15, 0).getTime(); // Sat Nov 14
  assert.equal(m.rowTimeLabel(new Date(2026, 10, 14, 9, 38).toISOString(), now, en), '9:38');
  assert.equal(m.rowTimeLabel(new Date(2026, 10, 13, 23, 0).toISOString(), now, en), 'Yesterday');
  assert.equal(m.rowTimeLabel(new Date(2026, 10, 13 - 1, 8, 0).toISOString(), now, en), 'Thu');
  assert.equal(m.rowTimeLabel(new Date(2026, 10, 2, 8, 0).toISOString(), now, en), 'Nov 2');
  assert.equal(m.rowTimeLabel(null, now, en), null);
});

test('unread pill: hidden at 0, 99+ cap', () => {
  assert.equal(m.unreadLabel(0), null);
  assert.equal(m.unreadLabel(undefined), null);
  assert.equal(m.unreadLabel(7), '7');
  assert.equal(m.unreadLabel(120), '99+');
});

test('Live and Starts', () => {
  const now = new Date(2026, 10, 14, 15, 0).getTime();
  const later = new Date(2026, 10, 15, 7, 0).toISOString();
  const end = new Date(2026, 10, 16).toISOString();
  assert.equal(m.isLive({ activity_state: 'idle', starts_at: null, expires_at: end }, now), false); // no start, no activity: not Live
  assert.equal(m.isLive({ activity_state: 'idle', starts_at: new Date(2026, 10, 14, 9).toISOString(), expires_at: end }, now), true);
  assert.equal(m.isLive({ activity_state: 'idle', starts_at: new Date(2026, 10, 14, 9).toISOString(), expires_at: new Date(2026, 10, 14, 14).toISOString() }, now), false);
  assert.equal(m.isLive({ activity_state: 'idle', starts_at: later, expires_at: end }, now), false);
  assert.equal(m.isLive({ activity_state: 'active', starts_at: later, expires_at: end }, now), true);
  assert.equal(m.startsLabel(later, now, en), 'Starts Sun 7:00 AM');
  assert.equal(m.startsLabel(new Date(2026, 10, 30, 19, 5).toISOString(), now, en), 'Starts Nov 30 7:05 PM');
  assert.equal(m.startsLabel(new Date(2026, 10, 14, 9).toISOString(), now, en), null);
});

test('rows sort newest last item first; rooms without one keep their order after', () => {
  const rows = [{ id: 'a', t: null }, { id: 'b', t: '2026-11-14T08:00:00Z' }, { id: 'c', t: null }, { id: 'd', t: '2026-11-14T09:00:00Z' }];
  assert.deepEqual(m.sortByLastItem(rows, (r) => r.t).map((r) => r.id), ['d', 'b', 'a', 'c']);
});

test('VoiceOver: one element in the spec order', () => {
  assert.equal(
    m.rowAccessibilityLabel(en, { name: 'Saturday Lake Loop', live: true, unread: 3, line: 'Jun: Running 5 min late', meta: '5 people · ends in 5h 27m' }),
    'Saturday Lake Loop, live, 3 unread, Jun: Running 5 min late, 5 people, ends in 5h 27m',
  );
});

test('Rooms home wires summaries, drops the type word, uses the shared Pill; chat marks read', () => {
  const h = src('app/(tabs)/index.tsx');
  assert.match(h, /fetchRoomSummaries\(/);
  assert.match(h, /sortByLastItem\(group\.rows/);
  assert.doesNotMatch(h, /en\.rooms\.types\[/);
  // V2: the Live tag is the V1 Tag (wash, dot), not the outlined Pill tag.
  assert.match(h, /<Tag label=\{en\.home\.row\.live\} dot \/>/);
  assert.match(h, /<Pill variant="count" text=\{unread\} \/>/);
  assert.match(h, /minHeight: 80/);
  const chat = src('app/room/[id]/index.tsx');
  assert.match(chat, /useMarkRoomRead\(room\.id, /);
  const api = src('features/event/room-summary-api.ts');
  assert.match(api, /rpc\('room_list_summaries', \{ p_room_ids: roomIds \}\)/);
  assert.match(api, /rpc\('mark_room_read', \{ p_room_id: roomId \}\)/);
});

test('line 3: Public · people · ends; before the start the time then the place', () => {
  const now = new Date(2026, 10, 14, 15, 0).getTime();
  const end = new Date(2026, 10, 14, 20, 27).toISOString();
  const rem = () => '5h 27m';
  const base = { starts_at: null, expires_at: end, place_name: 'Golden Gate', member_count: 5 };
  assert.equal(m.rowMetaLine({ ...base, visibility: 'public' }, now, en, rem), 'Public · 5 people · ends in 5h 27m');
  assert.equal(m.rowMetaLine({ ...base, visibility: 'private' }, now, en, rem), '5 people · ends in 5h 27m');
  assert.equal(m.rowMetaLine({ ...base, member_count: null }, now, en, rem), 'ends in 5h 27m');
  const later = new Date(2026, 10, 15, 7, 0).toISOString();
  assert.equal(m.rowMetaLine({ ...base, starts_at: later, visibility: 'public' }, now, en, rem), 'Starts Sun 7:00 AM · Golden Gate');
  assert.equal(m.rowMetaLine({ ...base, starts_at: later, place_name: '  ' }, now, en, rem), 'Starts Sun 7:00 AM');
});
