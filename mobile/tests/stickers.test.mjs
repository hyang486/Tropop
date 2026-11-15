// B3: sticker catalog and reaction helpers (pure; npm test).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chipLabel, groupReactions, MAX_REACTION_CHIPS, REACTIONS, reactionLabel, STICKER_TABS, STICKERS, stickerById,
  stickerCaption, stickerPreview, stickersIn,
} from '../src/lib/stickers.ts';

test('catalog: 27 unique stickers, USC first, every tab populated', () => {
  assert.equal(STICKERS.length, 27);
  assert.equal(new Set(STICKERS.map((s) => s.id)).size, 27);
  assert.deepEqual(STICKER_TABS, ['USC', 'Meet up', 'Connect']);
  assert.deepEqual(STICKER_TABS.map((t) => stickersIn(t).length), [3, 12, 12]);
});

test('captions and previews, unknown id falls back to the id', () => {
  assert.equal(stickerCaption('meetup-01'), 'On my way!');
  assert.equal(stickerCaption('future-99'), 'future-99');
  assert.equal(stickerById('future-99'), undefined);
  assert.equal(stickerPreview('Sora', 'meetup-01'), 'Sora sent a sticker: On my way!');
});

test('reactions: ids 1-12, first six in the bar', () => {
  assert.deepEqual(REACTIONS.map((r) => r.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(REACTIONS.filter((r) => r.bar).map((r) => r.id), [1, 2, 3, 4, 5, 6]);
  assert.equal(reactionLabel(1), 'Love');
  assert.equal(reactionLabel(99), '');
});

test('groupReactions: counts, mine, order, +N overflow', () => {
  const rows = [
    { user_id: 'a', reaction: 2 }, { user_id: 'b', reaction: 2 }, { user_id: 'me', reaction: 1 },
    { user_id: 'a', reaction: 3 }, { user_id: 'a', reaction: 4 }, { user_id: 'a', reaction: 5 },
  ];
  const { chips, more } = groupReactions(rows, 'me');
  assert.equal(chips.length, MAX_REACTION_CHIPS);
  assert.deepEqual(chips[0], { reaction: 2, count: 2, mine: false });
  assert.equal(chips[1].reaction, 1);
  assert.equal(chips[1].mine, true);
  assert.equal(more, 1);
  assert.deepEqual(groupReactions([], 'me'), { chips: [], more: 0 });
});

test('chipLabel for VoiceOver', () => {
  assert.equal(chipLabel({ reaction: 1, count: 3, mine: true }), 'Love, 3, including you');
  assert.equal(chipLabel({ reaction: 5, count: 1, mine: false }), 'Haha, 1');
});
