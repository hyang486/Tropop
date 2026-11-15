import * as Haptics from 'expo-haptics';

/**
 * UX3-A04 / UX3-B03: the app's only haptics. Five calls, each matched to one kind of action (HIG "Playing haptics").
 * Haptics are not motion, so Reduce Motion does not silence them; iOS itself mutes the Taptic Engine in Low Power
 * Mode, with system haptics off, while the camera or dictation is active. Call only after the action succeeded
 * (no haptic on a failed action), never on scroll or plain navigation. Failures are ignored: feedback is optional.
 */
function fire(run: () => Promise<void>) {
  // A missing native module (or any failure, sync or async) must never reach the caller's action.
  try {
    run().catch(() => undefined);
  } catch {
    // ignored
  }
}

export const haptics = {
  /** A chip, segment, switch or stepper value changed; a code digit typed; a pull-to-refresh triggered. */
  selection: () => fire(() => Haptics.selectionAsync()),
  /** A primary press was accepted (a message sent, a primary Button). */
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A room created, a code accepted, a profile saved, Arrived, Copy code, an original saved. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Emergency set (confirmed). */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** A wrong code or a rejected entry. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
