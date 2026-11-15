import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { QLink, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import {
  listConnectionQrCodes,
  listConnections,
  removeConnection,
  reportQrCode,
  type Connection,
  type PartnerQrCode,
} from '@/lib/connect';
import { isRecentlyUpdated, opensFromLink, toConnectError, type ConnectApp } from '@/lib/connect-plan';

import { connectCopy as t } from './copy';
import { openOrOfferStore } from './open-app';
import { AppMark, connectTokens, QrImage } from './parts';
import { QrFullScreen, type FullScreenQr } from './qr-full-screen';
import { ConfirmSheet } from './sheets';

type Data = { person: Connection | null; codes: PartnerQrCode[] };

/** Mock 05 / spec §4: one card per shared app; Open in <app>, Code not working?, Remove connection. No Block (H6). */
export function ConnectionScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [data, setData] = useState<Data | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [full, setFull] = useState<FullScreenQr | null>(null);
  const [reporting, setReporting] = useState<ConnectApp | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [connections, codes] = await Promise.all([listConnections(), listConnectionQrCodes(userId)]);
      setData({ person: connections.find((c) => c.otherId === userId) ?? null, codes });
      setError(null);
    } catch (e) {
      setError(t.errors[toConnectError(e).kind]);
    }
  }, [userId]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const name = data?.person?.otherName ?? t.someone;

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function open(code: PartnerQrCode) {
    if (opensFromLink(code.app, code.link)) void openOrOfferStore(code.app, code.link!);
    else setFull({ app: code.app, path: code.imagePath, ownerName: name, fallback: true });
  }

  async function report() {
    if (!reporting || !userId) return;
    setReportBusy(true);
    try {
      await reportQrCode(userId, reporting);
      setReporting(null);
      AccessibilityInfo.announceForAccessibility(t.toldOn(name));
      await load();
    } catch (e) {
      setReporting(null);
      setError(t.errors[toConnectError(e).kind]);
    } finally {
      setReportBusy(false);
    }
  }

  function confirmRemove() {
    Alert.alert(t.removeConnectionTitle(name), t.removeConnectionBody, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.remove,
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          setRemoving(true);
          try {
            await removeConnection(userId);
            router.back();
          } catch (e) {
            setError(t.errors[toConnectError(e).kind]);
            setRemoving(false);
          }
        },
      },
    ]);
  }

  const person = data?.person;
  const meta = person
    ? [t.connectedOn(person.createdAt), person.roomName ? t.metIn(person.roomName) : null].filter(Boolean).join(' · ')
    : null;

  return (
    <QScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      {data === undefined && !error ? <ActivityIndicator style={styles.loading} /> : null}
      {person ? (
        <View style={styles.header}>
          <Avatar path={person.otherAvatarPath} name={name} size={72} />
          <View style={styles.headerText}>
            <Text style={styles.name} accessibilityRole="header" numberOfLines={2}>
              {name}
            </Text>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
        </View>
      ) : null}
      {data && person && data.codes.length === 0 ? <Text style={styles.meta}>{t.noCodesNow(name)}</Text> : null}
      {person
        ? data?.codes.map((code) => (
            <View key={code.app} style={styles.card}>
              <View style={styles.cardHead}>
                <AppMark app={code.app} size={32} />
                <Text style={styles.appName}>{t.appName(code.app)}</Text>
                {isRecentlyUpdated(code.updatedAt) ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{t.updated}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => setFull({ app: code.app, path: code.imagePath, ownerName: name, fallback: false })}
                accessibilityRole="imagebutton"
                accessibilityLabel={t.qrLabel(name, code.app)}
                style={styles.qrPress}
              >
                <QrImage path={code.imagePath} size={200} label={t.qrLabel(name, code.app)} />
              </Pressable>
              {code.reportedByMe ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>{t.toldOn(name)}</Text>
                </View>
              ) : null}
              <Button title={t.openIn(code.app)} onPress={() => open(code)} />
              {code.reportedByMe ? null : (
                <QLink title={t.codeNotWorking} onPress={() => setReporting(code.app)} />
              )}
            </View>
          ))
        : null}
      {data && !person && !error ? <Hint>{t.errors.notFound}</Hint> : null}
      {error ? <Hint tone="error">{error}</Hint> : null}
      {person ? (
        <View style={styles.footer}>
          {removing ? (
            <ActivityIndicator />
          ) : (
            <QLink title={t.removeConnection} tone="danger" onPress={confirmRemove} />
          )}
        </View>
      ) : null}
      <ConfirmSheet
        visible={reporting != null}
        onClose={() => setReporting(null)}
        title={t.letKnowTitle(name)}
        body={reporting ? t.letKnowBody(reporting, name) : ''}
        action={t.letKnowAction}
        onAction={() => void report()}
        busy={reportBusy}
      />
      <QrFullScreen qr={full} onClose={() => setFull(null)} />
    </QScreen>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 28, lineHeight: 36, fontWeight: '600', color: colors.label },
  meta: { fontSize: 14, lineHeight: 20, color: colors.ink2 },
  card: {
    backgroundColor: colors.lift,
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
    boxShadow: '0 2px 8px rgba(48,43,40,0.08)',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appName: { flex: 1, fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label },
  tag: { height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: connectTokens.softGold, justifyContent: 'center' },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.label },
  qrPress: { alignSelf: 'center' },
  notice: { backgroundColor: connectTokens.softGold, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  noticeText: { fontSize: 14, lineHeight: 20, color: colors.label },
  footer: { alignItems: 'center', marginTop: 8 },
});
