/** Square tile edge for an N-column grid: the container width minus the side padding and the gaps, split evenly. */
export function galleryTileSize(width: number, side: number, gap: number, columns: number): number {
  return Math.floor((width - side * 2 - gap * (columns - 1)) / columns);
}

/** Next measured container width from onLayout: keep the previous one for a 0 width, round to avoid sub-pixel churn. */
export function nextGalleryWidth(prev: number, measured: number): number {
  return measured > 0 ? Math.round(measured) : prev;
}
