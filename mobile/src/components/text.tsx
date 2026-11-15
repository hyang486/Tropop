import { type ComponentRef, forwardRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';

/**
 * B1 type (phase1 spec §4): Source Sans 3 everywhere. iOS ignores fontWeight with a custom family, so the weight in
 * the style picks the real font file (400 Regular, 600 Semibold, 700 Bold); no faux bold. A style that sets its own
 * fontFamily (code, mono) is left alone.
 */
export const FONT = { regular: 'SourceSans3-Regular', semibold: 'SourceSans3-Semibold', bold: 'SourceSans3-Bold' } as const;

export function sourceSans(style: TextProps['style']): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return flat;
  const w = String(flat.fontWeight ?? '400');
  const family = w === 'bold' || +w >= 700 ? FONT.bold : +w >= 600 ? FONT.semibold : FONT.regular;
  return { ...flat, fontFamily: family, fontWeight: undefined };
}

export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={sourceSans(style)} />;
});

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={sourceSans(style)} />;
});
