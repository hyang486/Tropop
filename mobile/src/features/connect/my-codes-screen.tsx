import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Fragment, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { QCaption, QScreen } from '@/components/q-screen';
import { colors, Hint } from '@/components/ui';
import { listMyQrCodes, type MyQrCode } from '@/lib/connect';
import { CONNECT_APPS, toConnectError, type ConnectApp } from '@/lib/connect-plan';

import { useAddQrCode } from './add-flow';
import { connectCopy as t } from './copy';
import { AppMark, QrImage, REPORTED_TEXT } from './parts';

/** Mock 01 / spec §1: My QR codes (Profile → My QR codes). */
export function MyCodesScreen() {
  const [codes, setCodes] = useState<MyQrCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCodes(await listMyQrCodes());
      setError(null);
    } catch (e) {
      setError(t.errors[toConnectError(e).kind]);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const add = useAddQrCode(() => void load());

  const byApp = new Map((codes ?? []).map((c) => [c.app, c]));
  const reported = (codes ?? []).find((c) => c.reportedAt);

  return (
    <QScreen
      title={t.myCodesTitle}
      subtitle={t.myCodesSubtitle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      {reported ? (
        <View style={styles.notice}>
          <View style={styles.dot} />
          <View style={styles.noticeText}>
            <Text style={styles.noticeTitle}>{t.reportedTitle(reported.reportedByName, reported.app)}</Text>
            <Text style={styles.noticeBody}>{t.reportedBody(reported.app)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void add.start(reported.app)}
            hitSlop={8}
            style={styles.noticeAction}
          >
            <Text style={styles.link}>{t.replace}</Text>
          </Pressable>
        </View>
      ) : null}
      {codes === null && !error ? <ActivityIndicator style={styles.loading} /> : null}
      {error ? <Hint tone="error">{error}</Hint> : null}
      {codes !== null ? (
        <View style={styles.card}>
          {CONNECT_APPS.map((app, i) => (
            <Fragment key={app}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <CodeRow
                app={app}
                code={byApp.get(app) ?? null}
                busy={add.busyApp === app}
                onAdd={() => void add.start(app)}
              />
              {add.inlineError?.app === app ? (
                <View style={styles.inlineError}>
                  <Hint tone="error">{add.inlineError.message}</Hint>
                </View>
              ) : null}
            </Fragment>
          ))}
        </View>
      ) : null}
      <QCaption>{t.myCodesFooter}</QCaption>
      {add.previewSheet}
    </QScreen>
  );
}

function CodeRow({
  app,
  code,
  busy,
  onAdd,
}: {
  app: ConnectApp;
  code: MyQrCode | null;
  busy: boolean;
  onAdd: () => void;
}) {
  const name = t.appName(app);
  if (!code) {
    return (
      <View style={styles.row}>
        <AppMark app={app} />
        <Text style={styles.name}>{name}</Text>
        {busy ? (
          <ActivityIndicator />
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={t.addLabel(app)} onPress={onAdd} style={styles.addHit}>
            <Text style={styles.link}>{t.add}</Text>
          </Pressable>
        )}
      </View>
    );
  }
  const meta = [t.added(code.updatedAt), code.reportedAt ? t.reportedOn(code.reportedAt) : null].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${meta}`}
      onPress={() => router.push({ pathname: '/connect/code/[app]', params: { app } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AppMark app={app} />
      <View style={styles.rowText}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {t.added(code.updatedAt)}
          {code.reportedAt ? <Text style={styles.reported}>{` · ${t.reportedOn(code.reportedAt)}`}</Text> : null}
        </Text>
      </View>
      {busy ? <ActivityIndicator /> : <QrImage path={code.imagePath} size={56} label={t.qrLabel(null, app)} />}
      <SymbolView name="chevron.right" size={14} tintColor={colors.ink2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 24 },
  card: { backgroundColor: colors.lift, borderRadius: 24, borderCurve: 'continuous', paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: colors.separator, marginLeft: 52 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  name: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.label },
  meta: { fontSize: 14, lineHeight: 20, color: colors.ink2 },
  reported: { color: REPORTED_TEXT },
  addHit: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  link: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.tint },
  inlineError: { paddingLeft: 52, paddingBottom: 12 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.softGold,
    borderRadius: 20,
    padding: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, alignSelf: 'flex-start', marginTop: 7 },
  noticeText: { flex: 1, gap: 2 },
  noticeTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.label },
  noticeBody: { fontSize: 16, lineHeight: 24, color: colors.label },
  noticeAction: { minHeight: 44, justifyContent: 'center' },
});
