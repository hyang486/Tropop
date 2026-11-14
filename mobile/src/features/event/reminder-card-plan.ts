// UX2-130 (R-C8): when the in-chat "Get a reminder" card shows. Pure, so node tests can import it.
// Same 24 h as REMINDER_WINDOW_MS (lib/expiry-plan); kept import-free for node tests (test pins they match).
export const REMINDER_CARD_MIN_LEFT_MS = 24 * 60 * 60 * 1000;

export const REMINDER_CARD_KEY_PREFIX = 'qrewing.reminderCard.v1.';
export const reminderCardKey = (roomId: string) => `${REMINDER_CARD_KEY_PREFIX}${roomId}`;

/**
 * Only while the permission is undetermined (not read yet = hidden), the room has more than 24 h left, no Emergency
 * is open, and "Not now" was not stored for this room (not read yet = hidden, so it never flashes).
 */
export function reminderCardShown(o: {
  permission: string | null;
  remainingMs: number;
  emergencyOpen: boolean;
  dismissed: boolean | null;
}): boolean {
  return (
    o.permission === 'undetermined' &&
    o.remainingMs > REMINDER_CARD_MIN_LEFT_MS &&
    !o.emergencyOpen &&
    o.dismissed === false
  );
}
