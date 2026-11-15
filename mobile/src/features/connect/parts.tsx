import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { qrImageUrl } from '@/lib/connect';
import type { ConnectApp } from '@/lib/connect-plan';
import { authHeaders } from '@/lib/media';

/**
 * Brand colours that phase 1 (rebuild-b1) adds to ui.tsx as colors.gold / colors.softGold. Local until that merges;
 * swap to the ui.tsx tokens then. reportedText: dark gold for "Reported Nov 16" (ink-on-light contrast ≥ 4.5:1).
 */
export const connectTokens = {
  gold: '#FFCC00',
  softGold: '#FFF2BF',
  reportedText: '#7A5C00',
  hairline: '#E6DED7',
};

/**
 * Official app icons (human H1 = B; ux connect-logos: the publishers' App Store icons, unmodified, only scaled).
 * 40 pt in rows and the fallback, 32 pt in the connection card header, 20 pt (32 files) in the Connected row (mock 03). Decorative: the name always sits next to it.
 */
const LOGO_40: Record<ConnectApp, number> = {
  kakaotalk: require('../../../assets/brand/connect/kakaotalk.png'),
  wechat: require('../../../assets/brand/connect/wechat.png'),
  whatsapp: require('../../../assets/brand/connect/whatsapp.png'),
  line: require('../../../assets/brand/connect/line.png'),
  linkedin: require('../../../assets/brand/connect/linkedin.png'),
};
const LOGO_32: Record<ConnectApp, number> = {
  kakaotalk: require('../../../assets/brand/connect/kakaotalk-32.png'),
  wechat: require('../../../assets/brand/connect/wechat-32.png'),
  whatsapp: require('../../../assets/brand/connect/whatsapp-32.png'),
  line: require('../../../assets/brand/connect/line-32.png'),
  linkedin: require('../../../assets/brand/connect/linkedin-32.png'),
};

export function AppMark({ app, size = 40 }: { app: ConnectApp; size?: 40 | 32 | 20 }) {
  return (
    <Image
      source={(size === 40 ? LOGO_40 : LOGO_32)[app]}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.225 }]}
      accessible={false}
      importantForAccessibility="no"
    />
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

/** Small count badge (gold, ink text) for pending requests. */
export function GoldBadge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge} accessibilityLabel={label}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { borderCurve: 'continuous', overflow: 'hidden' },
  qrBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: connectTokens.hairline,
    overflow: 'hidden',
    padding: 6,
  },
  qrImage: { flex: 1 },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: connectTokens.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: colors.label },
});
