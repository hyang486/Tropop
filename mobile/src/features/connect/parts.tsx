import { Image } from 'expo-image';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
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
  mark: { width: 40, height: 40 },
  markSlot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
