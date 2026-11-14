/**
 * UX3-B08: shared media shows inline in chat. A kind='media' chat line carries no media ids (#8: a media_id would
 * cascade-delete the line), so each line is matched to the uploader's ready items created after that uploader's
 * previous media line and no later than this line (the line is posted once the batch finished uploading).
 * Items deleted since then simply drop out; a line with no match keeps the plain "shared …" text.
 */

export type LineLike = { id: string; kind: string; sender_id: string | null; created_at: string };
export type MediaLike = { id: string; uploader_id: string; created_at: string; kind: string };

/** messages and media in any order; returns line id → its items, oldest first. */
export function mediaForLines<M extends MediaLike>(messages: readonly LineLike[], media: readonly M[]): Map<string, M[]> {
  const lines = messages
    .filter((m) => m.kind === 'media' && m.sender_id)
    .slice()
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const sorted = media.slice().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const out = new Map<string, M[]>();
  const prevBySender = new Map<string, number>();
  for (const line of lines) {
    const sender = line.sender_id as string;
    const end = Date.parse(line.created_at);
    const start = prevBySender.get(sender) ?? -Infinity;
    const items = sorted.filter((m) => {
      const t = Date.parse(m.created_at);
      return m.uploader_id === sender && t > start && t <= end;
    });
    prevBySender.set(sender, end);
    if (items.length > 0) out.set(line.id, items);
  }
  return out;
}

export const SINGLE_WIDTH = 220;
export const SINGLE_MAX_HEIGHT = 280;
export const GRID_SIZE = 200;
export const GRID_GUTTER = 2;

/** One photo or video: 220 pt wide, aspect kept, at most 280 pt tall (square when the size is unknown). */
export function singleSize(width: number | null | undefined, height: number | null | undefined) {
  if (!width || !height) return { width: SINGLE_WIDTH, height: SINGLE_WIDTH };
  return { width: SINGLE_WIDTH, height: Math.min(SINGLE_MAX_HEIGHT, Math.round((SINGLE_WIDTH * height) / width)) };
}

/**
 * Splits a line's items: photos and videos go to the tiles (one big tile, or a 2×2 grid of up to 4 with "+N" on
 * the 4th when there are more), files to 56 pt rows.
 */
export function mediaLayout<M extends MediaLike>(items: readonly M[]) {
  const visual = items.filter((m) => m.kind !== 'file');
  const files = items.filter((m) => m.kind === 'file');
  const tiles = visual.slice(0, 4);
  const more = visual.length > 4 ? visual.length - 4 : 0;
  return { tiles, more, files, single: visual.length === 1 };
}

/** The tile edge in the 2×2 grid: (200 − 2) / 2 = 99 pt. */
export const GRID_TILE = (GRID_SIZE - GRID_GUTTER) / 2;
