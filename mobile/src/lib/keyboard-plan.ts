// QScreen keyboard rules (qa K1/K2 at 595f1cf). Pure (no React Native imports) so node --test can load them.
// All rects are window coordinates (measureInWindow), the same space as the keyboard's screenY on iOS.

export type Span = { top: number; bottom: number };

/**
 * How much of a screen's root the keyboard covers: the bottom padding that keeps the pinned actions above it.
 * Measured when the keyboard moves, so a sheet (pageSheet modal, K2) that is still animating when it first lays
 * out does not leave a stale offset. `keyboardTop` null = keyboard hidden.
 */
export function keyboardOverlap(root: { y: number; height: number }, keyboardTop: number | null): number {
  if (keyboardTop === null) return 0;
  return Math.max(0, Math.round(root.y + root.height - keyboardTop));
}

/**
 * The scroll offset that brings `target` into the `visible` part of the scroll view with `margin` around it, or
 * null when it is already in view. The focused field wins: `extra` (e.g. the form's submit button, K2) is
 * included only when field and extra fit together. A target taller than the view is aligned at its top.
 * The result is clamped to the scrollable range [0, maxY].
 */
export function revealScrollY(
  currentY: number,
  field: Span,
  visible: Span,
  maxY: number,
  extra?: Span | null,
  margin = 16,
): number | null {
  const room = visible.bottom - visible.top - 2 * margin;
  let target = field;
  if (extra) {
    const both = { top: Math.min(field.top, extra.top), bottom: Math.max(field.bottom, extra.bottom) };
    if (both.bottom - both.top <= room) target = both;
  }
  let delta = 0;
  if (target.bottom - target.top > room || target.top < visible.top + margin) {
    delta = target.top - (visible.top + margin);
  } else if (target.bottom > visible.bottom - margin) {
    delta = target.bottom - (visible.bottom - margin);
  }
  if (Math.abs(delta) < 1) return null;
  const next = Math.min(Math.max(0, currentY + delta), Math.max(0, maxY));
  return Math.abs(next - currentY) < 1 ? null : next;
}
