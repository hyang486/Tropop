import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { ProfileAvatarButton, Wordmark } from '@/components/tab-header';
import { colors } from '@/components/ui';
import { en } from '@/i18n/en';

/**
 * Bottom tabs (tabs-spec.md, human FINAL 02:00; JS Tabs on iOS and web, decided 03:40). Order: Today · Explore ·
 * Qrews · Moments. Every other screen stays in the root Stack and pushes over the bar. Route groups keep URLs, so
 * `/` is Today and `/calendar` is Moments.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={({ route }) => ({
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        sceneStyle: { backgroundColor: colors.background },
        headerLeft: route.name === 'index' || route.name === 'calendar' ? () => <Wordmark /> : undefined,
        headerRight: () => <ProfileAvatarButton />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: en.tabs.today }} />
      <Tabs.Screen name="explore" options={{ title: en.tabs.explore }} />
      <Tabs.Screen name="qrews" options={{ title: en.tabs.qrews }} />
      <Tabs.Screen name="calendar" options={{ title: en.tabs.moments }} />
    </Tabs>
  );
}
