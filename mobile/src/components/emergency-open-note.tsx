import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { spokenEllipsis } from '@/lib/emergency-plan';

/** UX2-114: the red line above End room / End activity / Leave while an Emergency is still open. */
export function EmergencyOpenNote({ text }: { text: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      <SymbolView name="exclamationmark.triangle" size={13} tintColor={colors.errorText} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

/** ux C36 b: true once `loading` has lasted 3 s; resets when loading ends. */
export function useSlow(loading: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading]);
  return loading && slow;
}

/**
 * UX2-114 (ux C36 b): the activity read failed (red line + Try again, 44 pt hit) or is slow (ink2 + small spinner).
 * It never disables End or Leave.
 */
export function EmergencyCheckNote({ line, onRetry }: { line: 'failed' | 'checking'; onRetry: () => Promise<void> }) {
  const copy = en.emergencyOpen;
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    void onRetry().finally(() => setRetrying(false));
  };
  if (line === 'checking') {
    return (
      <View style={styles.row} accessible accessibilityLabel={spokenEllipsis(copy.checking)}>
        <ActivityIndicator size="small" />
        <Text style={[styles.text, { color: colors.ink2 }]}>{copy.checking}</Text>
      </View>
    );
  }
  return (
    <View style={styles.failed}>
      <View style={[styles.row, styles.grow]} accessible accessibilityLabel={spokenEllipsis(copy.checkFailed)}>
        <SymbolView name="exclamationmark.triangle" size={13} tintColor={colors.errorText} />
        <Text style={styles.text}>{copy.checkFailed}</Text>
      </View>
      {/* Pattern E: busy from the press until the reload settles. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retrying ? copy.tryingAgain : copy.tryAgain}
        accessibilityState={{ busy: retrying }}
        disabled={retrying}
        onPress={retry}
        style={({ pressed }) => [styles.retry, pressed && { opacity: 0.5 }]}
      >
        {retrying ? <ActivityIndicator size="small" /> : <Text style={styles.retryText}>{copy.tryAgain}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  failed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  retry: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  retryText: { fontSize: 15, fontWeight: '600', color: colors.label },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  text: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.errorText },
});
