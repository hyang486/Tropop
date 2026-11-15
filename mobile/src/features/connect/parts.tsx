import { Image } from 'expo-image';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { qrImageUrl } from '@/lib/connect';
import type { ConnectApp } from '@/lib/connect-plan';
import { authHeaders } from '@/lib/media';

/** Dark gold for "Reported Nov 16" (ink-on-light contrast ≥ 4.5:1); not a B1 token (gold is never text on light). */
export const REPORTED_TEXT = '#7A5C00';

/**
 * App logos (ux "Logo compliance addendum", connect-spec.md): the publishers' brand-kit files from app-logos/40,
 * unaltered, one size (40 pt). No tile, radius, ring or tint (the app is light only). LinkedIn's [in] bug is not shipped while its licence is pending: an ink
 * SF Symbol `link` (24 pt) fills the 40 pt slot. Decorative: the app name is always the label next to it.
 */
const LOGO: Record<Exclude<ConnectApp, 'linkedin'>, number> = {
  kakaotalk: require('../../../assets/brand/connect/kakaotalk.png'),
  wechat: require('../../../assets/brand/connect/wechat.png'),
  whatsapp: require('../../../assets/brand/connect/whatsapp.png'),
  line: require('../../../assets/brand/connect/line.png'),
};

export function AppMark({ app }: { app: ConnectApp }) {
  if (app === 'linkedin') {
    return (
      <View style={styles.markSlot} accessible={false} importantForAccessibility="no-hide-descendants">
        <SymbolView name="link" size={24} tintColor={colors.label} />
      </View>
    );
  }
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Image source={LOGO[app]} style={styles.mark} accessible={false} />
    </View>
  );
}

/** A stored QR image (owner or accepted connection), read with the session token; memory cache only. */
export function QrImage({
  path,
  size,
  label,
  style,
}: {
  path: string;
  size: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { session } = useAuth();
  const [failed, setFailed] = useState<string | null>(null);
  const box = [styles.qrBox, { width: size, height: size, borderRadius: Math.min(16, size * 0.16) }, style];
  if (!session || failed === path) return <View style={box} accessibilityLabel={label} accessibilityRole="image" />;
  return (
    <View style={box}>
      <Image
        style={styles.qrImage}
        source={{ uri: qrImageUrl(path), headers: authHeaders(session.access_token), cacheKey: path }}
        cachePolicy="memory"
        contentFit="contain"
        accessibilityLabel={label}
        accessibilityRole="image"
        onError={() => setFailed(path)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 40, height: 40 },
  markSlot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qrBox: {
    // KEEP white: QR image surface (scan contrast), like qr-code/invite/full-screen.
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.separator,
    overflow: 'hidden',
    padding: 6,
  },
  qrImage: { flex: 1 },
});
