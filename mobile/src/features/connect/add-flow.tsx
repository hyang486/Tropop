import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { QLink } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { InkSwitch } from '@/features/event/ink-switch';
import { useAuth } from '@/lib/auth';
import { prepareQrImage, saveQrCode } from '@/lib/connect';
import { appForLink, toConnectError, type ConnectApp } from '@/lib/connect-plan';

import { connectCopy as t } from './copy';

type Preview = {
  app: ConnectApp;
  fullUri: string;
  fullMime: string | null;
  croppedUri: string | null;
  decoded: string;
};

/**
 * spec §1 Add flow: PHPicker (images only, no Photos permission) → decode on device → wrong-app check →
 * "Check your LINE code" preview (cropped by default, H5) → Save. Shared by My QR codes (Add) and the detail (Replace).
 */
export function useAddQrCode(onSaved: (app: ConnectApp) => void) {
  const { session } = useAuth();
  const [busyApp, setBusyApp] = useState<ConnectApp | null>(null);
  const [inlineError, setInlineError] = useState<{ app: ConnectApp; message: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function start(app: ConnectApp) {
    setInlineError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    setBusyApp(app);
    try {
      const { decoded, croppedUri } = await prepareQrImage(asset.uri);
      if (!decoded) {
        setInlineError({ app, message: t.noQrFound });
        return;
      }
      const owner = appForLink(decoded);
      const open = (target: ConnectApp) => {
        setShowFull(false);
        setSaveError(null);
        setPreview({ app: target, fullUri: asset.uri, fullMime: asset.mimeType ?? null, croppedUri, decoded });
      };
      if (owner === app) return open(app);
      if (owner) {
        // Another of the five apps: offer to file it there instead.
        Alert.alert(t.looksLike(owner), undefined, [
          { text: t.chooseAnother, style: 'cancel', onPress: () => void start(app) },
          { text: t.addTo(owner), onPress: () => open(owner) },
        ]);
        return;
      }
      Alert.alert(t.notFor(app), undefined, [
        { text: t.cancel, style: 'cancel' },
        { text: t.chooseAnother, onPress: () => void start(app) },
      ]);
    } finally {
      setBusyApp(null);
    }
  }

  async function save() {
    if (!preview || !session) return;
    setSaving(true);
    setSaveError(null);
    const useCrop = !showFull && preview.croppedUri != null;
    try {
      await saveQrCode({
        userId: session.user.id,
        app: preview.app,
        uri: useCrop ? preview.croppedUri! : preview.fullUri,
        mimeType: useCrop ? 'image/png' : preview.fullMime,
        decoded: preview.decoded,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const app = preview.app;
      setPreview(null);
      onSaved(app);
    } catch (e) {
      setSaveError(t.errors[toConnectError(e).kind]);
    } finally {
      setSaving(false);
    }
  }

  const shownUri = preview ? (!showFull && preview.croppedUri ? preview.croppedUri : preview.fullUri) : null;
  const previewSheet = (
    <Modal
      visible={preview != null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!saving) setPreview(null);
      }}
    >
      {preview ? (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetBody}>
          <Text style={styles.title} accessibilityRole="header">
            {t.previewTitle(preview.app)}
          </Text>
          <View style={styles.imageBox}>
            <Image
              source={{ uri: shownUri! }}
              style={styles.image}
              contentFit="contain"
              accessibilityLabel={t.qrLabel(null, preview.app)}
            />
          </View>
          {preview.croppedUri ? (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t.showFull}</Text>
              <InkSwitch value={showFull} onValueChange={setShowFull} accessibilityLabel={t.showFull} />
            </View>
          ) : null}
          <Text style={styles.body}>{t.previewBody(preview.app)}</Text>
          {saveError ? <Hint tone="error">{saveError}</Hint> : null}
          <View style={styles.actions}>
            <Button title={t.save} onPress={save} busy={saving} />
            <QLink title={t.cancel} onPress={() => setPreview(null)} disabled={saving} />
          </View>
        </ScrollView>
      ) : null}
    </Modal>
  );

  return { start, busyApp, inlineError, previewSheet };
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.sheet },
  sheetBody: { padding: 20, paddingTop: 28, gap: 16 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label },
  imageBox: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DED7',
    overflow: 'hidden',
    padding: 8,
  },
  image: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  toggleLabel: { fontSize: 16, lineHeight: 24, color: colors.label, flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 20, color: colors.ink2 },
  actions: { gap: 8, marginTop: 8 },
});
