import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { remindersOffShown } from '@/lib/reminders-plan';

/**
 * UX2-128: under Room info's Ends card, when notifications are denied: an ink2 line and Open Settings (44 pt hit).
 * Reads the permission without prompting, on mount and whenever the app becomes active. Otherwise renders nothing.
 */
export function RemindersOffNote() {
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const read = () => {
      Notifications.getPermissionsAsync()
        .then((p) => live && setStatus(p.status))
        .catch(() => {});
    };
    read();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') read();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  if (!remindersOffShown(status)) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{en.room.remindersOff}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void Linking.openSettings()}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}
      >
        <Text style={styles.buttonText}>{en.room.openSettings}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  text: { fontSize: 15, lineHeight: 20, color: colors.ink2 },
  button: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  buttonText: { fontSize: 15, fontWeight: '600', color: colors.label },
});
