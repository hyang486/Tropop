import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { QRowCard } from '@/components/q-row-card';
import { getConnectionQuota, listMyQrCodes } from '@/lib/connect';

import { connectCopy as t } from './copy';

/** spec §1 / §10: Profile → My QR codes and Connections (pending count; no push this pass). Account holders only. */
export function ProfileConnectRows() {
  const [codes, setCodes] = useState<number | null>(null);
  const [pending, setPending] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void Promise.all([listMyQrCodes(), getConnectionQuota()])
        .then(([mine, quota]) => {
          if (!live) return;
          setCodes(mine.length);
          setPending(quota.pendingIncoming);
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, []),
  );

  return (
    <>
      <QRowCard
        icon="qrcode"
        title={t.myCodesRow}
        value={codes == null ? undefined : t.myCodesValue(codes)}
        onPress={() => router.push('/connect/codes')}
      />
      <QRowCard
        icon="person.2"
        title={t.connectionsRow}
        value={pending > 0 ? t.pendingBadge(pending) : undefined}
        onPress={() => router.push('/connect')}
      />
    </>
  );
}
