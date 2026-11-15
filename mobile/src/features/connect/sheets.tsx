import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { QLink } from '@/components/q-screen';
import { Button, colors } from '@/components/ui';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';

import { connectCopy as t } from './copy';

/** A plain bottom sheet (lift, top radius 24, grabber) for Connect: Plus gate, "Add a QR code first", "Let Sora know?". */
export function ConnectSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const instant = useDismissOnLink(visible ? onClose : null);
  return (
    <Modal visible={visible} transparent animationType={instant ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} accessibilityRole="button" accessibilityLabel={t.close} onPress={onClose} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.grabber} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** spec §5 / §10, mock 04: shown before acting when Free is at its 1 connection. "Not now" changes nothing. */
export function PlusSheet({
  visible,
  onClose,
  pendingFrom,
}: {
  visible: boolean;
  onClose: () => void;
  /** At Accept: "Jun's request stays here until you decide." */
  pendingFrom?: string | null;
}) {
  return (
    <ConnectSheet visible={visible} onClose={onClose}>
      {/* The character trio of mock 04 waits for the B3 character art; an SF Symbol holds the slot. */}
      <SymbolView name="person.2.fill" size={44} tintColor={colors.label} style={styles.hero} />
      <Text style={styles.title} accessibilityRole="header">
        {t.plusTitle}
      </Text>
      <Text style={styles.body}>{t.plusBody}</Text>
      <View style={styles.actions}>
        <Button
          title={t.seePlus}
          onPress={() => {
            onClose();
            router.push('/plan-preview');
          }}
        />
        <QLink title={t.notNow} onPress={onClose} />
        {pendingFrom ? <Text style={styles.note}>{t.plusKeepsRequest(pendingFrom)}</Text> : null}
      </View>
    </ConnectSheet>
  );
}

/** Title + body + primary/secondary, for the small confirm sheets. */
export function ConfirmSheet({
  visible,
  onClose,
  title,
  body,
  action,
  onAction,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  busy?: boolean;
}) {
  return (
    <ConnectSheet visible={visible} onClose={onClose}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <Button title={action} onPress={onAction} busy={busy} />
        <QLink title={t.cancel} onPress={onClose} />
      </View>
    </ConnectSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber, marginBottom: 16 },
  hero: { alignSelf: 'center', width: 56, height: 56, marginBottom: 8 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label, textAlign: 'center' },
  body: { fontSize: 17, lineHeight: 24, color: colors.ink2, textAlign: 'center', marginTop: 8 },
  actions: { marginTop: 24, gap: 8, alignItems: 'stretch' },
  note: { fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
});
