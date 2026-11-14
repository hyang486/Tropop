// UX2-130 (R-C8): the in-chat card that asks for notification permission, once per room, in context.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { syncExpiryReminders } from '@/lib/expiry-reminders';
import type { ReminderRoom } from '@/lib/expiry-plan';

import { reminderCardKey, reminderCardShown } from './reminder-card-plan';

/** Reads the permission (no prompt) on mount and on app active, and the per-room "Not now". */
export function useReminderCard(room: ReminderRoom, remainingMs: number, emergencyOpen: boolean) {
  const [permission, setPermission] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    const read = () => {
      Notifications.getPermissionsAsync()
        .then((p) => live && setPermission(p.status))
        .catch(() => {});
    };
    read();
    AsyncStorage.getItem(reminderCardKey(room.id))
      .then((v) => live && setDismissed(v === '1'))
      .catch(() => live && setDismissed(false));
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') read();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [room.id]);

  const shown = reminderCardShown({ permission, remainingMs, emergencyOpen, dismissed }) || busy;

  async function turnOn() {
    setBusy(true);
    try {
      const asked = await Notifications.requestPermissionsAsync();
      setPermission(asked.status);
      await syncExpiryReminders([room], false, { ask: true });
    } catch (e) {
      console.warn('[reminder-card] turn on failed', e);
      setDismissed(true);
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    setDismissed(true);
    AsyncStorage.setItem(reminderCardKey(room.id), '1').catch(() => {});
  }

  return { shown, busy, turnOn, notNow };
}

export function ReminderCard({
  busy,
  onTurnOn,
  onNotNow,
}: {
  busy: boolean;
  onTurnOn: () => void;
  onNotNow: () => void;
}) {
  const s = en.chat;
  return (
    <View style={styles.card}>
      <View style={styles.head} accessible accessibilityRole="text" accessibilityLabel={s.reminderCardTitle}>
        <SymbolView name="bell" size={20} tintColor={colors.label} />
        <Text style={styles.title}>{s.reminderCardTitle}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={onTurnOn}
          style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.6 }]}
        >
          <Text style={styles.primaryText}>{s.reminderCardTurnOn}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onNotNow}
          hitSlop={4}
          style={({ pressed }) => [styles.text, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.textLabel}>{s.reminderCardNotNow}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    padding: 16,
    gap: 12,
    marginVertical: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.label,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 15, fontWeight: '600', color: colors.onTint },
  text: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLabel: { fontSize: 15, color: colors.label },
});
