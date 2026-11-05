import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { en } from '@/i18n/en';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();
  const signedIn = !!session;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerLargeTitle: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={signedIn} redirectTo="/welcome">
        <Stack.Screen name="index" options={{ title: en.home.title, headerLargeTitle: true }} />
        <Stack.Screen name="profile" options={{ title: en.profile.title }} />
        <Stack.Screen name="upgrade" options={{ title: en.upgrade.title, presentation: 'modal' }} />
        <Stack.Screen name="create-room" options={{ title: en.createRoom.title }} />
        <Stack.Screen name="join/index" options={{ title: en.join.title }} />
        <Stack.Screen name="scan" options={{ title: en.scan.title }} />
        <Stack.Screen name="preview" options={{ title: en.preview.title }} />
        <Stack.Screen name="room/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="room/[id]/info" options={{ title: en.room.info }} />
        <Stack.Screen name="room/[id]/gallery" options={{ title: en.media.title }} />
        <Stack.Screen name="room/[id]/media/[mediaId]" options={{ title: '' }} />
        <Stack.Screen name="room/[id]/invite" options={{ title: en.invite.title, presentation: 'modal' }} />
      </Stack.Protected>

      {/* QR deep link moment://join/<token>; handles both signed-in and signed-out users. */}
      <Stack.Screen name="join/[token]" options={{ headerShown: false }} />

      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="welcome" options={{ title: en.appName, headerShown: false }} />
        <Stack.Screen name="guest" options={{ title: en.guest.title }} />
        <Stack.Screen name="sign-in" options={{ title: en.signIn.title }} />
        <Stack.Screen name="sign-up" options={{ title: en.signUp.title }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
