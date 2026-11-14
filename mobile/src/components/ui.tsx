import type { ReactElement, ReactNode } from 'react';
import {
  ActivityIndicator,
  DynamicColorIOS,
  Platform,
  PlatformColor,
  Pressable,
  type RefreshControlProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  useColorScheme,
} from 'react-native';

/**
 * Qrew palette (work list "Palette and controls", supervisor A2): white ground, ink #181817, pale cards
 * #F6F6F2, black primary / outlined secondary buttons, pill chips, red only for Emergency and danger. Dark mode
 * inverts ink and ground (the ink art and title already use the light ink #EDEDE8 there).
 */
export const palette = {
  // cardStrong: own chat bubbles (Q 03.01 "On my way!"); dangerCard: the Emergency card and status (Q 03.02, 04.03).
  // ink2 (UX §3): hints, labels and timestamps; 6.4:1 on paper (light). secondaryLabel stays for placeholders only.
  light: { ink: '#181817', ink2: '#5E5E58', paper: '#FFFFFF', card: '#F6F6F2', cardStrong: '#EAEAE5', dangerCard: '#FDECEC' },
  dark: { ink: '#EDEDE8', ink2: '#A8A8A2', paper: '#000000', card: '#1C1C1E', cardStrong: '#2C2C2E', dangerCard: '#3A1A1A' },
} as const;

function themed(key: keyof typeof palette.light) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light: palette.light[key], dark: palette.dark[key] }) : palette.light[key];
}

/** Plain color strings for the current scheme (for react-native-svg, which needs strings). */
export function usePalette() {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const colors = {
  label: themed('ink'),
  /** UX §3: secondary text, section labels, captions and times. */
  ink2: themed('ink2'),
  /** Placeholders only (UX P1-12); use `ink2` for any text people need to read. */
  secondaryLabel: PlatformColor('secondaryLabel'),
  background: themed('paper'),
  field: themed('card'),
  fieldStrong: themed('cardStrong'),
  dangerField: themed('dangerCard'),
  separator: PlatformColor('separator'),
  /** The accent is ink: primary buttons, links, selected chips and segments, own chat bubbles. */
  tint: themed('ink'),
  /** Text and icons on a `tint` background (paper, so it inverts with the ink). */
  onTint: themed('paper'),
  danger: PlatformColor('systemRed'),
  warning: PlatformColor('systemOrange'),
};

/** Chips are pills. */
export const radius = { pill: 999 };

/** UX §3 spacing: a 4 pt grid. Screen gutter 16, gap between rows 8, gap before a section 24. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, gutter: 16, row: 8, section: 24 } as const;

/** UX §3 minimum heights: rows 44 pt (56 with a subtitle, 64 for a room row); hit areas 44. */
export const size = { row: 44, rowSubtitle: 56, roomRow: 64, hit: 44, chip: 36, button: 52, avatar: 32 } as const;

/**
 * UX §3 type roles for the system font. Titles use HandTitle (Patrick Hand): `titleSize.screen` 30, `.sheet` 24.
 * Colors are included, so a role can be spread into a style as is.
 */
export const titleSize = { screen: 30, sheet: 24 } as const;
export const textRole = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  body: { fontSize: 17, color: colors.label },
  bodyStrong: { fontSize: 17, fontWeight: '600', color: colors.label },
  secondary: { fontSize: 15, color: colors.ink2 },
  caption: { fontSize: 13, color: colors.ink2 },
  stat: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.label },
});

/**
 * J-1: under the translucent iOS 26 header the scroll view rests at a negative offset
 * (-adjustedContentInset.top). On every keyboard frame change, RN 0.88's automaticallyAdjustKeyboardInsets
 * calls scrollTo, which clamps y to >= -contentInset.top (the raw inset, 0) and ignores the automatic
 * inset, so the content jumped up under the header and stayed there after the keyboard closed.
 * scrollToOverflowEnabled skips that clamp; the keyboard handler still scrolls a hidden field into view.
 */
export function Screen({ children, refreshControl }: { children: ReactNode; refreshControl?: ReactElement<RefreshControlProps> }) {
  return (
    <ScrollView
      refreshControl={refreshControl}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      scrollToOverflowEnabled
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.secondaryLabel}
        style={styles.field}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  busy?: boolean;
  disabled?: boolean;
  /** Caps the title's Dynamic Type scale, for buttons in a pinned footer that must stay on screen. */
  maxFontSizeMultiplier?: number;
};

export function Button({ title, onPress, variant = 'primary', busy, disabled, maxFontSizeMultiplier }: ButtonProps) {
  const isPrimary = variant === 'primary';
  // A2: black (ink) primary; secondary and destructive are outlined, destructive stays red.
  const accent = variant === 'destructive' ? colors.danger : colors.tint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? { backgroundColor: colors.tint } : [styles.outlined, { borderColor: accent }],
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isPrimary ? colors.onTint : accent} />
      ) : (
        <Text
          style={[styles.buttonText, { color: isPrimary ? colors.onTint : accent }]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Hint({ children, tone = 'normal' }: { children: ReactNode; tone?: 'normal' | 'error' }) {
  return (
    <Text
      selectable
      style={[styles.hint, tone === 'error' && { color: colors.danger }]}
      accessibilityLiveRegion={tone === 'error' ? 'polite' : 'none'}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, color: colors.secondaryLabel, textTransform: 'uppercase' },
  field: {
    backgroundColor: colors.field,
    color: colors.label,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outlined: { borderWidth: 1.5, backgroundColor: 'transparent' },
  // Q 01.04: regular-weight label ("Join the room").
  buttonText: { fontSize: 17, fontWeight: '400' },
  hint: { fontSize: 15, color: colors.ink2 },
});
