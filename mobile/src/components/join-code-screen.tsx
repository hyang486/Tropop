import { useRouter } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useReduceMotion } from '@/components/enter-view';
import { QScreen } from '@/components/q-screen';
import { Button, colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { isValidCode, openInvite } from '@/lib/invite';
import { codeErrorText, SHAKE_STEPS } from '@/lib/join-code';
import { previewRoom, RoomError } from '@/lib/rooms';

const CODE_LENGTH = 5;

// UX3-A10: no art (the spec allows removing it), five code boxes, then Scan QR code 24 pt under them. The code goes on by
// itself after the 5th digit (no See room button, no QR note card). Signed in, the code is checked first
// (preview_room): a wrong code shakes the boxes (none under Reduce Motion), plays the Error haptic and shows a red
// line under them. Signed out, preview_room is not open to anon, so the code goes straight to the name step and is
// checked on Preview. Before: Qrew Q 02.03 "Find your room", five code boxes, the QR note card, See room / Scan QR
// code pinned at the bottom. One real text field sits over the boxes, so typing, paste and one-time-code
// autofill work as before. Signed in, See room opens the preview; signed out (route start/code, item 10), the
// code is held and the name step opens first (openInvite).
export function JoinCodeScreen() {
  const router = useRouter();
  const signedIn = !!useAuth().session;
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const reduceMotion = useReduceMotion();
  const [shake] = useState(() => new Animated.Value(0));

  function wrongCode(text: string, isWrong: boolean) {
    setError(text);
    if (!isWrong) return;
    errorHaptic();
    if (reduceMotion !== false) return;
    shake.setValue(0);
    Animated.sequence(
      SHAKE_STEPS.map((step) => Animated.timing(shake, { toValue: step.x, duration: step.ms, useNativeDriver: true })),
    ).start();
  }

  async function submit(value: string) {
    if (checking) return;
    if (!isValidCode(value)) {
      setError(en.join.codeInvalid);
      return;
    }
    setError(null);
    if (!signedIn) {
      openInvite({ code: value }, false, { preview: () => {}, name: () => router.push('/guest') });
      return;
    }
    setChecking(true);
    try {
      await previewRoom({ code: value });
      router.push({ pathname: '/preview', params: { code: value } });
    } catch (e) {
      const text = codeErrorText(e);
      wrongCode(text, e instanceof RoomError && e.kind === 'invalid');
    } finally {
      setChecking(false);
    }
  }

  function onChange(t: string) {
    const next = t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(next);
    if (next.length < CODE_LENGTH) setError(null);
    if (next.length === CODE_LENGTH && next !== code) void submit(next);
  }

  return (
    <QScreen
      title={en.join.title}
      subtitle={en.join.subtitle}
    >
      <Pressable onPress={() => inputRef.current?.focus()} accessible={false} style={styles.boxesWrap}>
        <Animated.View
          style={[styles.boxes, { transform: [{ translateX: shake }] }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const active = focused && (i === code.length || (i === CODE_LENGTH - 1 && code.length === CODE_LENGTH));
            return (
              <View key={i} style={[styles.box, active && styles.boxActive]}>
                <Text style={[styles.digit, !code[i] && styles.placeholder]}>{code[i] ?? '–'}</Text>
              </View>
            );
          })}
        </Animated.View>
        <TextInput
          selectionColor={colors.label}
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          editable={!checking}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={CODE_LENGTH}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => void submit(code)}
          accessibilityLabel={en.join.codeLabel}
          caretHidden
          style={styles.hiddenInput}
        />
      </Pressable>
      {checking ? (
        <ActivityIndicator style={styles.caption} accessibilityLabel={en.join.checking} />
      ) : error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={styles.scan}>
        <Button
          title={en.join.scan}
          variant="secondary"
          onPress={() => router.push(signedIn ? '/scan' : '/start/scan')}
        />
      </View>
    </QScreen>
  );
}

/**
 * UX3-A10: the one Error haptic call site. developer's lib/haptics (ux3-haptics, cef8ee7) adds expo-haptics;
 * when it is merged this becomes `haptics.error()` (import { haptics } from '@/lib/haptics').
 */
function errorHaptic() {}

const styles = StyleSheet.create({
  boxesWrap: { marginVertical: 8 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 64,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  boxActive: { borderColor: colors.tint },
  digit: { fontSize: 24, color: colors.label, fontVariant: ['tabular-nums'] },
  placeholder: { color: colors.secondaryLabel, fontSize: 18 },
  // Covers the boxes so a tap focuses it and the system can offer autofill; drawn invisible.
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' },
  caption: { alignSelf: 'center' },
  error: { fontSize: 15, color: colors.errorText },
  scan: { marginTop: 12 },
});
