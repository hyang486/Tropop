// B3 client wiring (0043): reaction split, optimistic toggles, sticker Rooms line, sticker send path.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const plan = await import('../src/features/chat/message-checks-plan.ts');
const sum = await import('../src/features/event/room-summary.ts');
const { stickerPreview } = await import('../src/lib/stickers.ts');
const { en } = await import('../src/i18n/en.ts');
const { chatLine } = await import('../src/lib/chat-line.ts');

test('reaction 2 (or no column yet) is the check; other reactions become chips', () => {
  const { checks, reactions } = plan.splitReactionRows([
    { message_id: 'm1', user_id: 'a' },
    { message_id: 'm1', user_id: 'b', reaction: 2 },
    { message_id: 'm1', user_id: 'c', reaction: 5 },
    { message_id: 'm2', user_id: 'a', reaction: 7 },
  ]);
  assert.deepEqual(checks.map((c) => c.user_id), ['a', 'b']);
  assert.deepEqual(reactions.get('m1'), [{ user_id: 'c', reaction: 5 }]);
  assert.equal(reactions.get('m2').length, 1);
});

test('toggleReactionRows adds and removes one (message, user, reaction) row; 2 matches a legacy row', () => {
  const one = plan.toggleReactionRows([], 'm', 'u', 5);
  assert.equal(one.length, 1);
  assert.equal(plan.toggleReactionRows(one, 'm', 'u', 5).length, 0);
  assert.equal(plan.toggleReactionRows(one, 'm', 'u', 6).length, 2);
  assert.equal(plan.toggleReactionRows([{ message_id: 'm', user_id: 'u' }], 'm', 'u', 2).length, 0);
});

test('canReact: text, media and sticker only, never while sending', () => {
  assert.ok(plan.canReact({ kind: 'sticker' }) && plan.canReact({ kind: 'text' }) && plan.canReact({ kind: 'media' }));
  assert.ok(!plan.canReact({ kind: 'system' }) && !plan.canReact({ kind: 'text', pending: 'sending' }));
});

test('the Rooms row never shows the raw sticker id', () => {
  const s = { last_at: 'x', last_kind: 'sticker', last_body: 'meetup-05', last_sender_id: 'j', last_sender_name: 'Jun', unread: 0 };
  const line = sum.lastItemLine(s, 'me', en, chatLine, stickerPreview).text;
  assert.ok(line.startsWith('Jun sent a sticker: '));
  assert.ok(!line.includes('meetup-05'));
  assert.equal(sum.lastItemLine(s, 'me', en, chatLine).text, 'Jun sent a sticker');
});

test('sticker send is a plain insert with kind sticker; reactions go through the toggle rpc', () => {
  const chat = src('lib/chat.ts');
  assert.match(chat, /kind: 'sticker',\s*body: stickerId,\s*media_id: null/);
  assert.match(chat, /\.insert\(row\)/);
  assert.match(src('features/chat/message-checks.ts'), /toggle_message_reaction/);
});
