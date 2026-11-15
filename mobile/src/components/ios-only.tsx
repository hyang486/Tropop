import { Image, Pressable, StyleSheet, View } from 'react-native';

import { FONT, Text } from '@/components/text';
import { colors } from '@/components/ui';

const STICKERS = {
  'meetup-04': require('@/assets/brand/stickers/meetup-04.png'),
  'connection-01': require('@/assets/brand/stickers/connection-01.png'),
} as const;

/** Web state for features that need the phone (map, scanner). Spec: docs/evidence/ux/brand-rebuild/web-ios-only-spec.md. */
export function IosOnly({
  title,
  body,
  sticker,
  action,
}: {
  title: string;
  body: string;
  sticker: keyof typeof STICKERS;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.col}>
        <Image source={STICKERS[sticker]} style={styles.sticker} resizeMode="contain" accessible={false} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.button}>
            <Text style={styles.buttonLabel}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  col: { width: '100%', maxWidth: 360, alignItems: 'center' },
  sticker: { width: 140, height: 140, marginBottom: 16 },
  title: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 28, color: colors.label, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 16, lineHeight: 22, color: colors.ink2, textAlign: 'center' },
  button: { marginTop: 24, height: 48, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.wash },
  buttonLabel: { fontFamily: FONT.semibold, fontSize: 17, lineHeight: 22, color: colors.tint },
});
