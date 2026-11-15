import { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { QScreen } from '@/components/q-screen';
import { colors } from '@/components/ui';
import { OPEN_ROOMS_LIVE } from '@/features/event/open-room-plan';
import { OpenChatSection } from '@/features/event/open-chat-section';
import { Snackbar } from '@/features/event/snackbar';
import { en } from '@/i18n/en';

/** Explore tab (tabs-spec §1): the public rooms (Open chat) moved out of Today, full screen. */
export default function Explore() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // UX P1-6: one Open chat notice at a time; the id re-shows (and re-reads) the same text.
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const showNotice = useCallback((text: string) => setNotice((n) => ({ id: (n?.id ?? 0) + 1, text })), []);
  const hideNotice = useCallback(() => setNotice(null), []);
  // E1: why the list is empty plus one action (the same plain push as Today's Create); no button while Open chat is off.
  const empty = (
    <View style={{ flexGrow: 1, justifyContent: 'center' }}>
      <EmptyState
        art="meetup"
        title={en.openChat.emptyTitle}
        body={en.openChat.emptyBody}
        action={OPEN_ROOMS_LIVE ? { title: en.openChat.emptyAction, onPress: () => router.push({ pathname: '/create-room', params: { visibility: 'public' } }) } : undefined}
      />
    </View>
  );
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
      <OpenChatSection refreshKey={refreshKey} onNotice={showNotice} empty={empty} />
    </QScreen>
  );
}
