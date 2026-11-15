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
 * PLACEHOLDER app marks (human H1 = B: official logos). The official files from each company's brand kit are not in
 * the repo yet; this draws a coloured tile with the short name so layout and VoiceOver match the final. Replace the
 * body with the official image per app, same size, no recolouring.
 */
const MARK: Record<ConnectApp, { bg: string; fg: string; text: string }> = {
  kakaotalk: { bg: '#FEE500', fg: '#3C1E1E', text: 'TALK' },
  wechat: { bg: '#07C160', fg: '#FFFFFF', text: 'WC' },
  whatsapp: { bg: '#25D366', fg: '#FFFFFF', text: 'WA' },
  line: { bg: '#06C755', fg: '#FFFFFF', text: 'LINE' },
  linkedin: { bg: '#0A66C2', fg: '#FFFFFF', text: 'in' },
};

export function AppMark({ app, size = 40 }: { app: ConnectApp; size?: number }) {
  const m = MARK[app];
  return (
    <View
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.225, backgroundColor: m.bg }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.markText, { color: m.fg, fontSize: Math.round(size * (m.text.length > 2 ? 0.26 : 0.4)) }]}>
        {m.text}
      </Text>
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
  mark: { alignItems: 'center', justifyContent: 'center' },
  markText: { fontWeight: '800' },
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
