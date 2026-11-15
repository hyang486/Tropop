import AsyncStorage from '@react-native-async-storage/async-storage';

// B3 first run: after sign-up or guest name entry the app shows "Pick your character" once. The flag is set before the
// account is created (the signed-in state moves the user to Rooms immediately) and consumed by Rooms, so people who
// already had an account never see it. Skipping leaves the default character.
const KEY = 'moment.pick-character.pending.v1';

export async function markCharacterPrompt() {
  await AsyncStorage.setItem(KEY, '1').catch(() => undefined);
}

export async function clearCharacterPrompt() {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/** True once when the prompt is pending; clears the flag so it never shows twice. */
export async function takeCharacterPrompt(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(KEY)) !== '1') return false;
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
