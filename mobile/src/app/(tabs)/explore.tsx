import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

import { QScreen } from '@/components/q-screen';
import { colors } from '@/components/ui';
import { OpenChatSection } from '@/features/event/open-chat-section';
import { Snackbar } from '@/features/event/snackbar';
import { en } from '@/i18n/en';

/** Explore tab (tabs-spec §1): the public rooms (Open chat) moved out of Today, full screen. */
export default function Explore() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // UX P1-6: one Open chat notice at a time; the id re-shows (and re-reads) the same text.
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const showNotice = useCallback((text: string) => setNotice((n) => ({ id: (n?.id ?? 0) + 1, text })), []);
  const hideNotice = useCallback(() => setNotice(null), []);
  return (
    <QScreen
      title={en.tabs.explore}
      floating={notice ? <Snackbar notice={notice} onHide={hideNotice} /> : undefined}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.secondaryLabel}
          onRefresh={() => {
            // The section reloads on a new key; the spinner is a short acknowledgement, as on Today.
            setRefreshing(true);
            setRefreshKey((k) => k + 1);
            setTimeout(() => setRefreshing(false), 600);
          }}
        />
      }
    >
      <OpenChatSection refreshKey={refreshKey} onNotice={showNotice} />
    </QScreen>
  );
}
