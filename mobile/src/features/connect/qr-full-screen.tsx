import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { AccessibilityInfo, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, colors, Hint } from '@/components/ui';
import { QrPhotosDeniedError, saveQrToPhotos } from '@/lib/connect';
import { CONNECT_APP_SCHEME, toConnectError, type ConnectApp } from '@/lib/connect-plan';

import { connectCopy as t } from './copy';
import { AppMark, QrImage } from './parts';
import { openOrOfferStore } from './open-app';

export type FullScreenQr = { app: ConnectApp; path: string; ownerName: string; fallback: boolean };

/**
 * Mock 06 / spec §4 + §10: the QR on a white ground. `fallback` (KakaoTalk, WeChat, image-only codes) adds the
 * "can't be opened from a link" line, Save to Photos (primary) and Open <app> (secondary). Without it, this is the
 * plain "tap the QR" full screen for scanning with another phone.
 * TODO(spec §4): raise screen brightness while open; needs expo-brightness (native module, not installed).
 */
export function QrFullScreen({ qr, onClose }: { qr: FullScreenQr | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [denied, setDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setSaved(false);
    setDenied(false);
    setError(null);
    onClose();
  }

  async function save() {
    if (!qr) return;
    setSaving(true);
    setError(null);
    setDenied(false);
    try {
      await saveQrToPhotos(qr.path);
      setSaved(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility(t.savedToPhotos);
    } catch (e) {
      if (e instanceof QrPhotosDeniedError) setDenied(true);
      else setError(t.errors[toConnectError(e).kind]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={qr != null} animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
      {qr ? (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.body, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        >
          <Pressable
            style={styles.close}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t.close}
            hitSlop={8}
          >
            <SymbolView name="xmark" size={20} tintColor={colors.label} />
          </Pressable>
          <View style={styles.titleRow}>
            <AppMark app={qr.app} size={40} />
            <Text style={styles.title} accessibilityRole="header">
              {t.fallbackTitle(qr.ownerName, qr.app)}
            </Text>
          </View>
          <QrImage path={qr.path} size={280} label={t.qrLabel(`${qr.ownerName}'s`, qr.app)} style={styles.qr} />
          {qr.fallback ? (
            <>
              <Text style={styles.how}>
                {t.cantOpenFromLink(qr.app)} {t.fallbackHow(qr.app)}
              </Text>
              <View style={styles.actions}>
                <Button title={t.saveToPhotos} onPress={() => void save()} busy={saving} />
                {saved ? (
                  <View style={styles.savedRow} accessible accessibilityLabel={t.savedToPhotos}>
                    <SymbolView name="checkmark" size={14} tintColor={colors.label} />
                    <Text style={styles.saved}>{t.savedToPhotos}</Text>
                  </View>
                ) : null}
                {denied ? (
                  <View style={styles.deniedBox}>
                    <Text style={styles.how}>{t.photosDenied}</Text>
                    <Button title={t.openSettings} variant="secondary" onPress={() => void Linking.openSettings()} />
                  </View>
                ) : null}
                {error ? <Hint tone="error">{error}</Hint> : null}
                <Button
                  title={t.openApp(qr.app)}
                  variant="secondary"
                  onPress={() => void openOrOfferStore(qr.app, CONNECT_APP_SCHEME[qr.app])}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { paddingHorizontal: 16, gap: 20 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lift,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(48,43,40,0.08)',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label, flexShrink: 1 },
  qr: { alignSelf: 'center' },
  how: { fontSize: 16, lineHeight: 24, color: colors.ink2, textAlign: 'center' },
  actions: { gap: 12, alignItems: 'stretch' },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  saved: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.label },
  deniedBox: { gap: 8 },
});
