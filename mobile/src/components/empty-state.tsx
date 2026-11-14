import { StyleSheet, Text, View } from 'react-native';

import { InkArt } from '@/components/ink-art';
import { Button, colors } from '@/components/ui';
import type { ArtKey } from '@/lib/ink-art';

/**
 * UX §3 EmptyState: ink art (decorative, hidden from VoiceOver), a 17 pt semibold title, a 15 pt ink2 line and an
 * optional button. One look for every empty or failed list.
 */
export function EmptyState({
  title,
  body,
  art,
  artWidth = 160,
  action,
}: {
  title: string;
  body?: string;
  art?: ArtKey;
  artWidth?: number;
  action?: { title: string; onPress: () => void };
}) {
  return (
    <View style={styles.wrap}>
      {art ? <InkArt art={art} width={artWidth} /> : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? (
        <View style={styles.action}>
          <Button title={action.title} variant="secondary" onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: '600', color: colors.label, textAlign: 'center' },
  body: { fontSize: 15, color: colors.ink2, textAlign: 'center' },
  action: { marginTop: 8, alignSelf: 'stretch' },
});
