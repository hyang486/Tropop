import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Fragment, useCallback, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Avatar } from '@/components/avatar';
import { QCaption, QScreen } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import {
  cancelRequest,
  getConnectionQuota,
  listConnections,
  listConnectRequests,
  respondToRequest,
  type Connection,
  type ConnectionQuota,
  type ConnectRequest,
} from '@/lib/connect';
import { appNames, daysLeft, toConnectError } from '@/lib/connect-plan';

import { connectCopy as t } from './copy';
import { GoldBadge } from './parts';
import { PlusSheet } from './sheets';

type Data = { requests: ConnectRequest[]; connections: Connection[]; quota: ConnectionQuota };

/** Mock 03 / spec §3: Requests (incoming), Sent, Connected. Pending requests can be handled after the room ends. */
export function ConnectionsScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [plusFor, setPlusFor] = useState<ConnectRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const [requests, connections, quota] = await Promise.all([
        listConnectRequests(),
        listConnections(),
        getConnectionQuota(),
      ]);
      setData({ requests, connections, quota });
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

  async function run(id: string, action: () => Promise<unknown>, announce?: string) {
    setBusy(id);
    setError(null);
    try {
      await action();
      if (announce) AccessibilityInfo.announceForAccessibility(announce);
      await load();
    } catch (e) {
      const err = toConnectError(e);
      if (err.kind === 'limit') {
        const r = data?.requests.find((x) => x.requestId === id) ?? null;
        setPlusFor(r);
      } else setError(t.errors[err.kind]);
      await load();
    } finally {
      setBusy(null);
    }
  }

  function accept(r: ConnectRequest) {
    // spec §10: at the limit, the Plus sheet opens before acting.
    if (data && !data.quota.canAdd) return setPlusFor(r);
    const name = r.otherName ?? t.someone;
    void run(
      r.requestId,
      async () => {
        await respondToRequest(r.requestId, true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      t.connectedWith(name),
    );
  }

  const incoming = data?.requests.filter((r) => r.direction === 'incoming') ?? [];
  const sent = data?.requests.filter((r) => r.direction === 'sent') ?? [];
  const connections = data?.connections ?? [];
  const empty = data != null && incoming.length === 0 && sent.length === 0 && connections.length === 0;

  return (
    <QScreen
      title={t.connectionsTitle}
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
      {data === null && !error ? <ActivityIndicator style={styles.loading} /> : null}
      {error ? <Hint tone="error">{error}</Hint> : null}

      {incoming.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.section} accessibilityRole="header">
              {t.requests}
            </Text>
            <GoldBadge count={incoming.length} />
          </View>
          <View style={styles.card}>
            {incoming.map((r, i) => {
              const name = r.otherName ?? t.someone;
              const meta = [r.roomName ? t.metIn(r.roomName) : null, t.expiresIn(daysLeft(r.expiresAt))]
                .filter(Boolean)
                .join(' · ');
              return (
                <Fragment key={r.requestId}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.requestRow}>
                    <Avatar path={r.otherAvatarPath} name={name} size={44} />
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{name}</Text>
                      <Text style={styles.meta}>{meta}</Text>
                      {r.otherApps.length > 0 ? <Text style={styles.meta}>{t.shares(appNames(r.otherApps))}</Text> : null}
                      <View style={styles.requestActions}>
                        <View style={styles.acceptWrap}>
                          <Button
                            title={t.accept}
                            compact
                            onPress={() => accept(r)}
                            busy={busy === r.requestId}
                            disabled={busy !== null}
                          />
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy !== null}
                          onPress={() => void run(r.requestId, () => respondToRequest(r.requestId, false))}
                          style={styles.textAction}
                        >
                          <Text style={styles.decline}>{t.decline}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Fragment>
              );
            })}
          </View>
          <QCaption>{t.requestsFooter}</QCaption>
        </>
      ) : null}

      {sent.length > 0 ? (
        <>
          <Text style={styles.section} accessibilityRole="header">
            {t.sent}
          </Text>
          <View style={styles.card}>
            {sent.map((r, i) => {
              const name = r.otherName ?? t.someone;
              return (
                <Fragment key={r.requestId}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <Avatar path={r.otherAvatarPath} name={name} size={44} />
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{name}</Text>
                      <Text style={styles.meta}>{t.requestedOn(r.createdAt)}</Text>
                    </View>
                    {busy === r.requestId ? (
                      <ActivityIndicator />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${t.cancelRequest}, ${name}`}
                        disabled={busy !== null}
                        onPress={() => void run(r.requestId, () => cancelRequest(r.requestId))}
                        style={styles.textAction}
                      >
                        <Text style={styles.link}>{t.cancel}</Text>
                      </Pressable>
                    )}
                  </View>
                </Fragment>
              );
            })}
          </View>
        </>
      ) : null}

      {connections.length > 0 ? (
        <>
          <Text style={styles.section} accessibilityRole="header">
            {t.connectedSection}
          </Text>
          <View style={styles.card}>
            {connections.map((c, i) => {
              const name = c.otherName ?? t.someone;
              const meta = [t.connectedOn(c.createdAt), c.roomName ? t.metIn(c.roomName) : null].filter(Boolean).join(' · ');
              return (
                <Fragment key={c.otherId}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${name}, ${appNames(c.otherApps)}, ${meta}`}
                    onPress={() => router.push({ pathname: '/connect/person/[userId]', params: { userId: c.otherId } })}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Avatar path={c.otherAvatarPath} name={name} size={44} />
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{name}</Text>
                      {/* ux logo addendum: compact rows show app names only, no logos. */}
                      <Text style={styles.meta}>{[appNames(c.otherApps), meta].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <SymbolView name="chevron.right" size={14} tintColor={colors.ink2} />
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        </>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <SymbolView name="person.2" size={44} tintColor={colors.ink2} />
          <Text style={styles.emptyText}>{t.empty}</Text>
        </View>
      ) : null}

      <PlusSheet visible={plusFor != null} onClose={() => setPlusFor(null)} pendingFrom={plusFor?.otherName ?? null} />
    </QScreen>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  section: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.ink2, marginTop: 8 },
  card: { backgroundColor: colors.lift, borderRadius: 24, borderCurve: 'continuous', paddingHorizontal: 16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.wash2, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 },
  requestRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.label },
  meta: { fontSize: 14, lineHeight: 20, color: colors.ink2, flexShrink: 1 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  acceptWrap: { minWidth: 96 },
  textAction: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  decline: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.ink2 },
  link: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.tint },
  empty: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, lineHeight: 24, color: colors.ink2, textAlign: 'center' },
});
