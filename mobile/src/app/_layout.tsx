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
      </Stack.Protected>

      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
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
