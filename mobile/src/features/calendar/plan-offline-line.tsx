import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { Button, Hint } from '@/components/ui';
import { en } from '@/i18n/en';

import { rereadPlan } from './calendar-store';

/**
 * UX2-88: "Can't check your plan offline." with Try again (busy while reading). Also reads again on focus and when
 * the app comes to the front. Render it only while the plan state is 'offline'.
 */
export function PlanOfflineLine({ uid }: { uid: string | null | undefined }) {
  const [busy, setBusy] = useState(false);
  const retry = useCallback(async () => {
    if (!uid) return;
    setBusy(true);
    try {
      await rereadPlan(uid);
    } finally {
      setBusy(false);
    }
  }, [uid]);
  useFocusEffect(
    useCallback(() => {
      void retry();
    }, [retry]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void retry();
    });
    return () => sub.remove();
  }, [retry]);
  return (
    <>
      <Hint>{en.planPreview.offlineRetry}</Hint>
      <Button title={en.planPreview.tryAgain} variant="secondary" busy={busy} onPress={() => void retry()} />
    </>
  );
}
