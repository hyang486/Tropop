import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useOnSheet } from '@/components/q-screen';
import { colors, size } from '@/components/ui';

/**
 * One composer for chat-like inputs (UX P1-11, mockup m1): a 44 pt field with a 22 pt radius and a 32 pt ink
 * circle with an up-arrow inside its trailing edge. The circle is hidden while the field is empty.
 */
export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  sendLabel,
  canSend,
  busy = false,
  maxLength,
  ...rest
}: Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  sendLabel: string;
  canSend: boolean;
  busy?: boolean;
}) {
  const showCircle = busy || value.trim().length > 0;
  // UX2-48: on a pageSheet (Ask) the field is sheetField, or it would vanish into the dark sheet.
  const onSheet = useOnSheet();
  return (
    <View style={[styles.field, onSheet && styles.fieldOnSheet]}>
      <TextInput
        {...rest}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryLabel}
        accessibilityLabel={placeholder}
        maxLength={maxLength}
        multiline
      />
      {showCircle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
          accessibilityState={{ disabled: !canSend || busy, busy }}
          disabled={!canSend || busy}
          onPress={onSend}
          hitSlop={6}
          style={({ pressed }) => [styles.circle, (!canSend || pressed) && !busy && styles.dim]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onTint} />
          ) : (
            <SymbolView name="arrow.up" size={16} weight="bold" tintColor={colors.onTint} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldOnSheet: { backgroundColor: colors.sheetField },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: size.hit,
    borderRadius: 22,
    backgroundColor: colors.field,
    paddingLeft: 16,
    paddingRight: 6,
  },
  input: { flex: 1, maxHeight: 120, minHeight: size.hit, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: colors.label },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },
  dim: { opacity: 0.4 },
});
