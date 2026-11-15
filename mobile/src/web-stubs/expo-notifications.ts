// Web-only stub: expo-notifications has no web implementation for these calls.
const denied = { status: 'denied', granted: false, canAskAgain: false, expires: 'never' as const };
export const useLastNotificationResponse = () => null;
export const clearLastNotificationResponse = () => {};
export const setNotificationHandler = () => {};
export const getPermissionsAsync = async () => denied;
export const requestPermissionsAsync = async () => denied;
export const getAllScheduledNotificationsAsync = async () => [];
export const getPresentedNotificationsAsync = async () => [];
export const cancelScheduledNotificationAsync = async () => {};
export const scheduleNotificationAsync = async () => '';
export const SchedulableTriggerInputTypes = { DATE: 'date' } as const;
export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';
