import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type SFSymbol, SymbolView } from 'expo-symbols';
import { Children, isValidElement, type ReactElement, type ReactNode, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  type RefreshControlProps,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text, TextInput } from '@/components/text';

/**
 * Qrew palette, B1 (docs/evidence/ux/brand-rebuild/phase1-tokens-type-spec.md, USC edition, light only): Warm Ivory
 * ground, ink #302B28, Cardinal accent, gold for badges only (never text on light), softGold for the own bubble.
 * Emergency keeps danger/redwash; Cardinal never sits on a redwash surface.
 */
export const palette = {
  light: {
    ink: '#302B28',
    ink2: '#71645E',
    paper: '#FFFCF8',
    wash: '#F5EFE7',
    wash2: '#E6DED7',
    lift: '#FFFFFF',
    redwash: '#FBE9E7',
    card: '#F5EFE7',
    cardStrong: '#E6DED7',
    dangerCard: '#FBE9E7',
    errorText: '#D70015',
    sheet: '#FFFFFF',
    scrim: 'rgba(48,43,40,0.40)',
    grabber: 'rgba(113,100,94,0.4)',
    sheetCard: '#F5EFE7',
    tileOnLift: '#E6DED7',
    onDanger: '#FFFFFF',
    dangerSolid: '#D70015',
    placeholder: '#9A918A',
    separator: '#E6DED7',
    tint: '#990000',
    tintPressed: '#7A0000',
    onTint: '#FFFFFF',
    gold: '#FFCC00',
    softGold: '#FFF2BF',
  },
} as const;

function themed(key: keyof typeof palette.light) {
  return palette.light[key];
}

/** Plain color strings (for react-native-svg, which needs strings). Light only since B1. */
export function usePalette() {
  return palette.light;
}

export const colors = {
  label: themed('ink'),
  /** UX §3: secondary text, section labels, captions and times. */
  ink2: themed('ink2'),
  /** Placeholders only (UX P1-12); use `ink2` for any text people need to read. */
  secondaryLabel: themed('placeholder'),
  background: themed('paper'),
  field: themed('card'),
  fieldStrong: themed('cardStrong'),
  dangerField: themed('dangerCard'),
  /** V1: quiet fills (secondary buttons, tags, thumbs, system capsules). */
  wash: themed('wash'),
  /** V1: avatars, grabber, dividers on wash; pressed secondary buttons. */
  wash2: themed('wash2'),
  /** V1: cards you act on, others' bubbles, floating controls (with `useLift`). */
  lift: themed('lift'),
  /** V5b: unselected status tiles on the lift sheet (wash in light; lighter than the sheet in dark). */
  tileOnLift: themed('tileOnLift'),
  /** V5b: text and icons on a selected Emergency (danger) fill. */
  onDanger: themed('onDanger'),
  /** V1: Emergency surfaces and the destructive button. */
  redwash: themed('redwash'),
  separator: themed('separator'),
  /** Cardinal: primary buttons, links, selected chips, segments and tiles. */
  tint: themed('tint'),
  tintPressed: themed('tintPressed'),
  /** Gold: unread/count badges only (ink text on it); never text on light. */
  gold: themed('gold'),
  /** Own chat bubble, the Ends-in timer chip, gentle notices (ink text). */
  softGold: themed('softGold'),
  /** Text and icons on a `tint` background (paper, so it inverts with the ink). */
  onTint: themed('onTint'),
  danger: themed('dangerSolid'),
  // UX2 a11y: fixable error text only (systemRed text is 3.1–3.6:1 in light mode). Emergency fills and destructive
  // buttons keep danger.
  errorText: themed('errorText'),
  warning: '#B25E00',
  /** UX2-45: custom bottom sheets. Cards, rows and bubbles inside a sheet use `fieldStrong`, not `field`. */
  sheet: themed('sheet'),
  scrim: themed('scrim'),
  grabber: themed('grabber'),
  /** UX2-48: cards, fields and bubbles on a pageSheet screen (light #F6F6F2 as before; dark #2C2C2E on #1C1C1E). */
  sheetField: themed('sheetCard'),
  /** UX2-84: badges on photos (video badge). Fixed, not themed: they sit on the image, not on paper. */
  photoScrim: 'rgba(0,0,0,0.55)',
  onPhotoScrim: '#FFFFFF',
};

/** UX2-45: one look for every custom bottom sheet: scrim, 16 pt top radius on `sheet`, a 36×5 grabber. */
export const sheetStyle = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim },
  surface: { backgroundColor: colors.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: 'continuous' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.grabber },
});

/** Chips and buttons are pills. V1: card 22, thumb/tile 14, tag 10 (all borderCurve continuous). */
export const radius = { pill: 999, card: 24, tile: 16, tag: 999, field: 16 };

/** Lift shadow: warm, not black (B1). Light only, so there is a single entry. */
export const elevation = {
  lift: {
    light: { boxShadow: '0 2px 8px rgba(48,43,40,0.08)' },
  },
} as const satisfies Record<string, Record<'light', ViewStyle>>;

/** The lift shadow. */
export function useLift(): ViewStyle {
  return elevation.lift.light;
}

/** UX §3 spacing: a 4 pt grid. V1: screen gutter 20 (was 16), gap between rows 8, gap before a section 24. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, gutter: 20, row: 8, section: 24 } as const;

/** UX §3 minimum heights: rows 44 pt (56 with a subtitle, 64 for a room row); hit areas 44. */
export const size = { row: 44, rowSubtitle: 56, roomRow: 64, hit: 44, chip: 36, button: 52, avatar: 32 } as const;

/**
 * UX §3 type roles for the system font. Titles use HandTitle (Source Sans 3 semibold): `titleSize.screen` 28, `.sheet` 20.
 * Colors are included, so a role can be spread into a style as is.
 */
export const titleSize = { screen: 28, sheet: 20 } as const;
export const textRole = StyleSheet.create({
  section: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.ink2 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.label },
  body: { fontSize: 16, lineHeight: 24, color: colors.label },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.label },
  secondary: { fontSize: 14, lineHeight: 20, color: colors.ink2 },
  caption: { fontSize: 12, lineHeight: 18, color: colors.ink2 },
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
        selectionColor={colors.label}
        placeholderTextColor={colors.secondaryLabel}
        style={styles.field}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
}

/** UX2-72: one red for the destructive confirm fill in both modes (systemRed elsewhere is unchanged). */
const DESTRUCTIVE_FILL = '#D70015';

type ButtonProps = {
  title: string;
  onPress: () => void;
  /** UX2-72: destructiveFill is the confirm on End room / End activity: a #D70015 fill with a white label. */
  variant?: 'primary' | 'secondary' | 'destructive' | 'destructiveFill';
  busy?: boolean;
  disabled?: boolean;
  /** Caps the title's Dynamic Type scale, for buttons in a pinned footer that must stay on screen. */
  maxFontSizeMultiplier?: number;
  accessibilityHint?: string;
  /** UX2-140: defaults to title so VoiceOver keeps the name while busy shows the spinner. */
  accessibilityLabel?: string;
  /** UX3-A02: 48 pt instead of 52, for the Join / Create pair on Rooms. */
  compact?: boolean;
  /** V2: a 17 pt SF Symbol before the title, in the label color (Join's scan corners, Create's plus). */
  icon?: SFSymbol;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  busy,
  disabled,
  maxFontSizeMultiplier,
  accessibilityHint,
  accessibilityLabel,
  compact,
  icon,
}: ButtonProps) {
  // Primary is a Cardinal fill with a white label; secondary (B2) a lift fill, 1.5 pt tint border and tint label (wash pressed); destructive a redwash fill with an errorText label. UX2-72: destructiveFill stays #D70015 with white.
  const fill = {
    primary: colors.tint,
    secondary: colors.lift,
    destructive: colors.redwash,
    destructiveFill: DESTRUCTIVE_FILL,
  }[variant];
  const label = {
    primary: colors.onTint,
    secondary: colors.tint,
    destructive: colors.errorText,
    destructiveFill: '#FFFFFF',
  }[variant];
  const quiet = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && { minHeight: 48 },
        icon && styles.buttonWithIcon,
        { backgroundColor: quiet && pressed && !disabled ? colors.wash : fill },
        // B2: secondary is a lift fill with a 1.5 pt tint border and a tint label.
        quiet && { borderWidth: 1.5, borderColor: colors.tint },
        // UX2-138: disabled is the enabled style at 40% (0.6 read as an enabled gray fill in light mode).
        disabled ? { opacity: 0.4 } : pressed && !quiet && { opacity: variant === 'destructiveFill' ? 0.85 : 0.6 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={label} />
      ) : (
        <>
          {icon ? <SymbolView name={icon} size={17} weight="semibold" tintColor={label} /> : null}
          <Text
            style={[styles.buttonText, { color: label }]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Hint({ children, tone = 'normal' }: { children: ReactNode; tone?: 'normal' | 'error' }) {
  return (
    <Text
      selectable
      style={[styles.hint, tone === 'error' && { color: colors.errorText }]}
      accessibilityLiveRegion={tone === 'error' ? 'polite' : 'none'}
    >
      {children}
    </Text>
  );
}

/** iOS Reduce Transparency: glass surfaces fall back to a lift fill (spec Accessibility). */
export function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((v) => live && setOn(v), () => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

/**
 * UX §3 GlassIconButton: a 44 pt round icon button (Liquid Glass on iOS 26, a card circle elsewhere), e.g. a
 * sheet's close (P2-4). `label` is the VoiceOver name, since the button shows only the symbol.
 */
export function GlassIconButton({
  symbol,
  label,
  onPress,
}: {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
}) {
  const reduceTransparency = useReduceTransparency();
  const glass = Platform.OS === 'ios' && isLiquidGlassAvailable() && !reduceTransparency;
  const icon = <SymbolView name={symbol} size={17} weight="semibold" tintColor={colors.label} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.glassButton, !glass && styles.glassFallback, pressed && { opacity: 0.6 }]}
    >
      {glass ? (
        <GlassView isInteractive style={styles.glassFill}>
          {icon}
        </GlassView>
      ) : (
        icon
      )}
    </Pressable>
  );
}

/**
 * V1 Card: lift fill, lift shadow, radius 22. Rows are separated by a 1 pt wash line inset 16 pt from both sides
 * (iOS inset grouped); use one Card per section instead of a grey box per row.
 */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const lift = useLift();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.card, lift, style]}>
      {rows.map((row, i) => (
        <View key={row.key ?? i}>
          {i > 0 ? <View style={styles.cardDivider} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}

/** B2 Tag ("Live", "Run on"): softGold pill, 12 pt semibold ink, an optional 6 pt Cardinal dot. No outline. */
export function Tag({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <View style={styles.tag}>
      {dot ? <View style={styles.tagDot} /> : null}
      <Text style={styles.tagText} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.lift, borderRadius: radius.card, borderCurve: 'continuous' },
  cardDivider: { height: 1, marginHorizontal: 16, backgroundColor: colors.separator },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.softGold,
    borderRadius: radius.tag,
    borderCurve: 'continuous',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.label },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.label },
  screen: { padding: 20, gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  field: {
    backgroundColor: colors.field,
    color: colors.label,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
  },
  // V1: full pills (height / 2; 999 keeps the pill when Dynamic Type grows the button).
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonWithIcon: { flexDirection: 'row', gap: 8 },
  // V1: 17 pt semibold (was 400).
  buttonText: { fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 15, color: colors.ink2 },
  glassButton: { width: size.hit, height: size.hit, borderRadius: size.hit / 2, alignItems: 'center', justifyContent: 'center' },
  glassFallback: { backgroundColor: colors.lift },
  glassFill: { width: size.hit, height: size.hit, borderRadius: size.hit / 2, alignItems: 'center', justifyContent: 'center' },
});
