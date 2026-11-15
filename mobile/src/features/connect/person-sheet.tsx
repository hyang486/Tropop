import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Avatar } from '@/components/avatar';
import { QLink } from '@/components/q-screen';
import { Button, colors, Hint } from '@/components/ui';
import {
  cancelRequest,
  getConnectionQuota,
  listMyQrCodes,
  listRoomConnectPeople,
  requestConnection,
  respondToRequest,
  type RoomConnectPerson,
} from '@/lib/connect';
import { appNames, personConnectBlock, toConnectError, type ConnectApp } from '@/lib/connect-plan';
import { haptics } from '@/lib/haptics';

import { connectCopy as t } from './copy';
import { ConnectSheet, PlusContent } from './sheets';

async function fetchCard(roomId: string, userId: string): Promise<Loaded> {
  const [people, mine, quota] = await Promise.all([listRoomConnectPeople(roomId), listMyQrCodes(), getConnectionQuota()]);
  return {
    them: people.find((p) => p.userId === userId) ?? null,
    myApps: mine.map((c) => c.app),
    canAdd: quota.canAdd,
  };
}

export type SheetPerson = { userId: string; name: string; avatarPath: string | null };

type Loaded = { them: RoomConnectPerson | null; myApps: ConnectApp[]; canAdd: boolean };

/**
 * Mock 02 / spec §2 + §10: the person card in a live room. Avatar, name, "In <room>", then the Connect block whose
 * state comes from personConnectBlock. Plus gate and "Add a QR code first" replace the content in place (one modal).
 */
export function PersonConnectSheet({
  visible,
  onClose,
  roomId,
  roomName,
  roomLive,
  myId,
  person,
}: {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  roomLive: boolean;
  myId: string | null;
  person: SheetPerson | null;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [mode, setMode] = useState<'card' | 'plus' | 'addFirst'>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!person) return;
    try {
      setData(await fetchCard(roomId, person.userId));
      setError(null);
    } catch (e) {
      setError(t.errors[toConnectError(e).kind]);
    }
  }, [roomId, person]);

  // The caller keys this sheet by person, so each open starts from a fresh card.
  const personId = person?.userId;
  useEffect(() => {
    if (!visible || !personId) return;
    let live = true;
    fetchCard(roomId, personId).then(
      (d) => live && setData(d),
      (e) => live && setError(t.errors[toConnectError(e).kind]),
    );
    return () => {
      live = false;
    };
  }, [visible, roomId, personId]);

  if (!person) return null;
  const name = person.name;
  const them = data?.them;
  const block = data
    ? personConnectBlock({
        isMe: person.userId === myId,
        roomLive,
        canConnect: them?.canConnect ?? false,
        state: them?.state ?? 'none',
        theirApps: them?.apps ?? [],
        myCodeCount: data.myApps.length,
        quotaCanAdd: data.canAdd,
      })
    : null;

  async function run(action: () => Promise<string | void>, announce?: (r: string | void) => string) {
    setBusy(true);
    setError(null);
    try {
      const r = await action();
      haptics.press();
      if (announce) AccessibilityInfo.announceForAccessibility(announce(r));
      await load();
    } catch (e) {
      setError(t.errors[toConnectError(e).kind]);
    } finally {
      setBusy(false);
    }
  }

  function connect() {
    if (block?.kind !== 'connect') return;
    if (block.gated) return setMode('plus');
    if (block.needsCodes) return setMode('addFirst');
    void run(
      () => requestConnection(roomId, person!.userId),
      (r) => (r === 'connected' ? t.connectedWith(name) : t.requestSent),
    );
  }

  function accept() {
    if (block?.kind !== 'incoming' || !them?.requestId) return;
    if (block.gated) return setMode('plus');
    const id = them.requestId;
    void run(() => respondToRequest(id, true), () => t.connectedWith(name));
  }

  const shareLine = data && data.myApps.length > 0 ? t.youllShare(appNames(data.myApps), name) : null;

  return (
    <ConnectSheet visible={visible} onClose={onClose}>
      {mode === 'plus' ? (
        <PlusContent
          onClose={() => {
            onClose();
          }}
          pendingFrom={block?.kind === 'incoming' ? name : null}
        />
      ) : mode === 'addFirst' ? (
        <>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {t.addFirstTitle}
          </Text>
          <Text style={styles.sheetBody}>{t.addFirstBody}</Text>
          <View style={styles.actions}>
            <Button
              title={t.addFirstAction}
              onPress={() => {
                onClose();
                router.push('/connect/codes');
              }}
            />
            <QLink title={t.cancel} onPress={() => setMode('card')} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.head}>
            <Avatar path={person.avatarPath} name={name} size={72} />
            <View style={styles.headText}>
              <Text style={styles.name} accessibilityRole="header" numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.meta}>{t.inRoom(roomName)}</Text>
            </View>
          </View>
          {!data && !error ? <ActivityIndicator style={styles.loading} /> : null}
          {block && block.kind !== 'hidden' ? (
            <View style={styles.block}>
              {block.kind === 'theyHaveNone' ? (
                <Text style={styles.meta}>{t.theyHaveNone(name)}</Text>
              ) : them && them.apps.length > 0 ? (
                <Text style={styles.meta}>
                  {t.has} {appNames(them.apps)}
                </Text>
              ) : null}
              {block.kind === 'connect' ? (
                <>
                  <Button
                    title={t.connect}
                    onPress={connect}
                    busy={busy}
                    accessibilityLabel={t.connectLabel(name)}
                    accessibilityHint={t.connectHint(name)}
                  />
                  {shareLine ? <Text style={styles.meta}>{shareLine}</Text> : null}
                </>
              ) : null}
              {block.kind === 'requested' ? (
                <>
                  <Button title={t.requested} variant="secondary" disabled onPress={() => {}} />
                  {them?.requestId ? (
                    <QLink
                      title={t.cancelRequest}
                      disabled={busy}
                      onPress={() => void run(() => cancelRequest(them.requestId!))}
                    />
                  ) : null}
                </>
              ) : null}
              {block.kind === 'incoming' ? (
                <>
                  <Button title={t.accept} onPress={accept} busy={busy} />
                  {shareLine ? <Text style={styles.meta}>{shareLine}</Text> : null}
                  {them?.requestId ? (
                    <QLink
                      title={t.decline}
                      disabled={busy}
                      onPress={() => void run(() => respondToRequest(them.requestId!, false))}
                    />
                  ) : null}
                </>
              ) : null}
              {block.kind === 'connected' ? (
                <Button
                  title={`${t.connected} ›`}
                  accessibilityLabel={t.connected}
                  variant="secondary"
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/connect/person/[userId]', params: { userId: person.userId } });
                  }}
                />
              ) : null}
            </View>
          ) : null}
          {error ? <Hint tone="error">{error}</Hint> : null}
        </>
      )}
    </ConnectSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headText: { flex: 1, gap: 2 },
  name: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label },
  meta: { fontSize: 14, lineHeight: 20, color: colors.ink2 },
  loading: { marginVertical: 16 },
  block: { gap: 10, marginTop: 16 },
  sheetTitle: { fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.label, textAlign: 'center' },
  sheetBody: { fontSize: 16, lineHeight: 24, color: colors.ink2, textAlign: 'center', marginTop: 8 },
  actions: { marginTop: 24, gap: 8, alignItems: 'stretch' },
});
