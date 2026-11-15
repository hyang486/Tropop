// B3 stickers and reactions: the catalog (ids, tabs, captions) and the pure helpers. Pure: the PNG sources are
// required by components/sticker-art, so this file has no React Native imports and is unit tested.

export type StickerTab = 'USC' | 'Meet up' | 'Connect';
export const STICKER_TABS: readonly StickerTab[] = ['USC', 'Meet up', 'Connect'];

export type Sticker = { id: string; tab: StickerTab; caption: string };

export const STICKERS: readonly Sticker[] = [
  { id: 'usc-fight-on', tab: 'USC', caption: 'Fight on!' },
  { id: 'usc-lets-go', tab: 'USC', caption: 'Let\'s go!' },
  { id: 'usc-made-it', tab: 'USC', caption: 'Made it!' },
  { id: 'meetup-01', tab: 'Meet up', caption: 'On my way!' },
  { id: 'meetup-02', tab: 'Meet up', caption: 'I\'m here!' },
  { id: 'meetup-03', tab: 'Meet up', caption: 'Wait for me' },
  { id: 'meetup-04', tab: 'Meet up', caption: 'Where are you?' },
  { id: 'meetup-05', tab: 'Meet up', caption: 'Need water' },
  { id: 'meetup-06', tab: 'Meet up', caption: 'Taking a break' },
  { id: 'meetup-07', tab: 'Meet up', caption: 'I\'m stopping' },
  { id: 'meetup-08', tab: 'Meet up', caption: 'Need a hand' },
  { id: 'meetup-09', tab: 'Meet up', caption: 'Slow down' },
  { id: 'meetup-10', tab: 'Meet up', caption: 'Let\'s go!' },
  { id: 'meetup-11', tab: 'Meet up', caption: 'Got it!' },
  { id: 'meetup-12', tab: 'Meet up', caption: 'Thank you' },
  { id: 'connection-01', tab: 'Connect', caption: 'Hey, crew!' },
  { id: 'connection-02', tab: 'Connect', caption: 'Nice to meet you' },
  { id: 'connection-03', tab: 'Connect', caption: 'Count me in' },
  { id: 'connection-04', tab: 'Connect', caption: 'Coffee break?' },
  { id: 'connection-05', tab: 'Connect', caption: 'Good idea!' },
  { id: 'connection-06', tab: 'Connect', caption: 'LOL' },
  { id: 'connection-07', tab: 'Connect', caption: 'Well done!' },
  { id: 'connection-08', tab: 'Connect', caption: 'Photo time!' },
  { id: 'connection-09', tab: 'Connect', caption: 'Sent!' },
  { id: 'connection-10', tab: 'Connect', caption: 'Save your pics' },
  { id: 'connection-11', tab: 'Connect', caption: 'See you soon' },
  { id: 'connection-12', tab: 'Connect', caption: 'Good times' },
];

export const REACTIONS: readonly { id: number; label: string; bar: boolean }[] = [
  { id: 1, label: 'Love', bar: true },
  { id: 2, label: 'Got it', bar: true },
  { id: 3, label: 'Like', bar: true },
  { id: 4, label: 'Clap', bar: true },
  { id: 5, label: 'Haha', bar: true },
  { id: 6, label: 'Wow', bar: true },
  { id: 7, label: 'Water', bar: false },
  { id: 8, label: 'Location', bar: false },
  { id: 9, label: 'Time', bar: false },
  { id: 10, label: 'Coffee', bar: false },
  { id: 11, label: 'Photo', bar: false },
  { id: 12, label: 'Hi', bar: false },
];

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

export function stickerById(id: string): Sticker | undefined {
  return BY_ID.get(id);
}

export function stickersIn(tab: StickerTab): Sticker[] {
  return STICKERS.filter((s) => s.tab === tab);
}

/** A sticker's caption; an unknown id renders the id as text (the art may arrive in a later build). */
export function stickerCaption(id: string): string {
  return BY_ID.get(id)?.caption ?? id;
}

/** Rooms row / notice copy: "{name} sent a sticker: {caption}". */
export function stickerPreview(name: string, id: string): string {
  return `${name} sent a sticker: ${stickerCaption(id)}`;
}

export function reactionLabel(id: number): string {
  return REACTIONS.find((r) => r.id === id)?.label ?? '';
}

export type ReactionRow = { user_id: string; reaction: number };
export type ReactionChip = { reaction: number; count: number; mine: boolean };

/** Max chips under a bubble; the rest collapse into "+N". */
export const MAX_REACTION_CHIPS = 4;

/** Group rows into chips, most used first (ties by reaction id); returns the shown chips and the hidden count. */
export function groupReactions(rows: readonly ReactionRow[], me: string | undefined): { chips: ReactionChip[]; more: number } {
  const by = new Map<number, ReactionChip>();
  for (const r of rows) {
    const c = by.get(r.reaction) ?? { reaction: r.reaction, count: 0, mine: false };
    c.count += 1;
    if (r.user_id === me) c.mine = true;
    by.set(r.reaction, c);
  }
  const all = [...by.values()].sort((a, b) => b.count - a.count || a.reaction - b.reaction);
  return { chips: all.slice(0, MAX_REACTION_CHIPS), more: Math.max(0, all.length - MAX_REACTION_CHIPS) };
}

/** VoiceOver label for a chip: "Love, 3, including you". */
export function chipLabel(c: ReactionChip): string {
  return `${reactionLabel(c.reaction)}, ${c.count}${c.mine ? ', including you' : ''}`;
}
