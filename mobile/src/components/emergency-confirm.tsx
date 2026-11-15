import { useSyncExternalStore } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/components/ui";
import { en } from "@/i18n/en";

/**
 * F-EMX8: the "Send Emergency?" confirm is an in-app modal (not a native Alert, which cannot be dismissed from
 * code). When the room flips to ended while it is open, `dismissEmergencyConfirmForEnd` closes it at once and says
 * the Emergency was not sent, without waiting for a tap on Send. The host is mounted once per screen, above the
 * chat / ended switch, so it outlives that flip.
 */
type Pending = { onSend: () => void; onEnded?: () => void };

let pending: Pending | null = null;
const listeners = new Set<() => void>();

function set(next: Pending | null) {
  pending = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Opens the confirm; `onSend` runs when the person taps Send Emergency. */
export function openEmergencyConfirm(onSend: () => void, onEnded?: () => void) {
  set({ onSend, onEnded });
}

/** True while the confirm is showing (for tests and callers). */
export function emergencyConfirmOpen(): boolean {
  return pending !== null;
}

/** The room just ended: closes an open confirm and shows the "not sent" alert at once. No-op when it is not open. */
export function dismissEmergencyConfirmForEnd() {
  const p = pending;
  if (!p) return;
  set(null);
  Alert.alert(en.activity.emergencyEndedTitle, en.activity.emergencyEndedBody, [
    { text: en.activity.emergencyEndedOk, onPress: () => p.onEnded?.() },
  ]);
}

export function EmergencyConfirmHost() {
  const open = useSyncExternalStore(subscribe, () => pending);
  if (!open) return null;
  const close = () => set(null);
  return (
    // An in-screen overlay, not a native Modal: iOS can drop a Modal presented while the status picker's Modal is
    // still animating out, which would make Emergency impossible to send. No presenter, no race.
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          {en.activity.emergencyConfirmTitle}
        </Text>
        <Text style={styles.body}>{en.activity.emergencyConfirmBody}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={close}
            style={[styles.button, styles.cancel]}
          >
            <Text style={styles.cancelText}>{en.room.cancel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const p = open;
              close();
              p.onSend();
            }}
            style={[styles.button, styles.send]}
          >
            <Text style={styles.sendText}>{en.activity.sendEmergency}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: colors.lift,
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: colors.label,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  cancel: { backgroundColor: colors.wash },
  cancelText: { fontSize: 16, fontWeight: "600", color: colors.label },
  send: { backgroundColor: colors.danger },
  sendText: { fontSize: 16, fontWeight: "600", color: colors.onDanger },
});
