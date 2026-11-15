// The Ask Trok button's footprint, in one place: the button, every screen that pads its scroll content for
// it, and QScreen's `floating` slot read these (UI audit 2026-11-13 item 1). Plain numbers, no imports, so a
// shared component can use them without pulling in the button.
export const QREWING_FAB_SIZE = 52;
/** Gap between the button and the bottom (and right) edge of the area it floats in. */
export const QREWING_FAB_MARGIN = 12;
/**
 * UX P0-2: bottom padding for the chat list above the composer, 12 pt gap + 52 pt button = 64 pt (the list's
 * inset is composer + 64 pt), so the newest message scrolls clear of the button.
 */
export const QREWING_FAB_CLEARANCE = QREWING_FAB_MARGIN + QREWING_FAB_SIZE;

/** QScreen's `floating` slot (the calendar's own 56 pt Trok button): margin + button + margin, unchanged by P0-2. */
export const QSCREEN_FLOATING_CLEARANCE = 12 + 56 + 12;
