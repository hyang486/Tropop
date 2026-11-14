/** Pure reminder-permission rules (no Expo imports, so tests can load them). */

/**
 * UX2-127: what syncExpiryReminders does about the notification permission. 'granted': schedule. 'ask': show the
 * iOS prompt (the default, room screen). 'no': skip. `{ ask: false }` (Rooms list) never prompts.
 */
export function permissionStep(
  current: { granted: boolean; canAskAgain: boolean },
  options: { ask?: boolean } | undefined,
): 'granted' | 'ask' | 'no' {
  if (current.granted) return 'granted';
  if (options?.ask === false || !current.canAskAgain) return 'no';
  return 'ask';
}

/** UX2-128: the Room info "Reminders are off" line shows only for a denied permission. */
export function remindersOffShown(status: string | null): boolean {
  return status === 'denied';
}
