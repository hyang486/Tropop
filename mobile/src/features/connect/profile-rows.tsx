import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getConnectionQuota, listMyQrCodes } from '@/lib/connect';

/**
 * spec §1 / §10: counts for the Profile Connect rows (account holders only; no push this pass). The rows themselves
 * are direct children of the Profile card (ux P1: a Card only draws dividers between its direct children).
 */
export function useConnectSummary(enabled: boolean): { codes: number | null; pending: number } {
  const [codes, setCodes] = useState<number | null>(null);
  const [pending, setPending] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
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
    }, [enabled]),
  );

  return { codes, pending };
}
