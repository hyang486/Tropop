import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { QLink, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import { deleteQrCode, listMyQrCodes, type MyQrCode } from '@/lib/connect';
import { isConnectApp, toConnectError } from '@/lib/connect-plan';

import { useAddQrCode } from './add-flow';
import { connectCopy as t } from './copy';
import { connectTokens, QrImage } from './parts';

/** spec §1 QR detail: the large image, "Added Nov 15", Replace, Remove; the reported notice on top. */
export function MyCodeDetailScreen() {
  const { app: raw } = useLocalSearchParams<{ app: string }>();
  const app = isConnectApp(raw) ? raw : null;
  const [code, setCode] = useState<MyQrCode | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    if (!app) return setCode(null);
    try {
      const all = await listMyQrCodes();
      setCode(all.find((c) => c.app === app) ?? null);
      setError(null);
    } catch (e) {
      setError(t.errors[toConnectError(e).kind]);
    }
  }, [app]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const add = useAddQrCode((saved) => {
    // Filed under another app from the "looks like" alert: that row is the new one; this screen's code is unchanged.
    if (saved === app) void load();
    else router.back();
  });

  if (!app) return null;

  function confirmRemove() {
    Alert.alert(t.removeTitle(app!), t.removeBody, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.remove,
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await deleteQrCode(app!);
            router.back();
          } catch (e) {
            setError(t.errors[toConnectError(e).kind]);
            setRemoving(false);
          }
        },
      },
    ]);
  }

  return (
    <QScreen title={t.appName(app)}>
      {code === undefined && !error ? <ActivityIndicator style={styles.loading} /> : null}
      {code?.reportedAt ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t.reportedNotice(code.reportedByName, app, code.reportedAt)}</Text>
          <Pressable accessibilityRole="button" onPress={() => void add.start(app)} hitSlop={8} style={styles.noticeAction}>
            <Text style={styles.link}>{t.replace}</Text>
          </Pressable>
        </View>
      ) : null}
      {code ? (
        <>
          <QrImage path={code.imagePath} size={280} label={t.qrLabel(null, app)} style={styles.image} />
          <Text style={styles.meta}>{t.added(code.updatedAt)}</Text>
          <View style={styles.actions}>
            <Button title={t.replace} variant="secondary" onPress={() => void add.start(app)} busy={add.busyApp === app} />
            {add.inlineError ? <Hint tone="error">{add.inlineError.message}</Hint> : null}
            {removing ? <ActivityIndicator /> : <QLink title={t.remove} tone="danger" onPress={confirmRemove} />}
          </View>
        </>
      ) : null}
      {error ? <Hint tone="error">{error}</Hint> : null}
      {add.previewSheet}
    </QScreen>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 24 },
  image: { alignSelf: 'center', marginTop: 8 },
  meta: { fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
  actions: { gap: 8, marginTop: 8 },
  link: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.tint },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: connectTokens.softGold,
    borderRadius: 20,
    padding: 16,
  },
  noticeText: { flex: 1, fontSize: 16, lineHeight: 24, color: colors.label },
  noticeAction: { minHeight: 44, justifyContent: 'center' },
});
