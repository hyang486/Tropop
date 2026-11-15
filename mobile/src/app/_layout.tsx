import * as Notifications from 'expo-notifications';
import { type Href, Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

import { HAND_FONTS } from '@/components/hand-title';
import { HomeHeaderButton } from '@/components/home-header-button';
import { startSiriMirror } from '@/features/event/siri-mirror';
// Trok Calendar: loaded at start so its SIGNED_OUT listener clears the phone-only calendar on sign-out.
import '@/features/calendar/calendar-store';
import { LocationReporters } from '@/components/location-reporters';
import { en } from '@/i18n/en';
import { AuthProvider, useAuth } from '@/lib/auth';
import { dismissSheets } from '@/lib/dismiss-sheets';
import { reminderRoomFromResponse, setPendingReminderRoom } from '@/lib/expiry-reminders';
import { hasOpenModal, setRootLinkHandler } from '@/lib/root-link';
import { pushFromRoot, resetToRoot } from '@/lib/root-nav';
import { useReduceMotion } from '@/components/enter-view';

SplashScreen.preventAutoHideAsync();

// The stack's own roots: these never need a way home.
const ROOT_SCREENS = new Set(['(tabs)', 'welcome', 'join/[token]']);

function RootNavigator() {
  const { session, loading } = useAuth();
  const signedIn = !!session;
  // A11y sweep: with Reduce Motion on, the media viewer cross-fades in instead of sliding.
  const reduceMotion = useReduceMotion();
  // Tropop: the bundled title fonts load from assets at runtime (no rebuild). The splash waits for them so the
  // first title is not drawn in the system font; a failed load just keeps the system font.
  const [fontsLoaded, fontError] = useFonts(HAND_FONTS);
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!loading && fontsReady) SplashScreen.hideAsync();
  }, [loading, fontsReady]);

  // A tapped expiry reminder (also one that cold-started the app) opens its room. The room screen
  // checks access and shows the ended notice if the room is gone. Signed out: held until sign-in.
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (loading) return;
    const roomId = reminderRoomFromResponse(response);
    if (!roomId) return;
    Notifications.clearLastNotificationResponse();
    // C-3: from the root, so the room is never pushed inside an open Invite/Upgrade modal.
    // UX2-46: open custom sheets close first (no animation).
    dismissSheets();
    if (signedIn) pushFromRoot(router, { pathname: '/room/[id]', params: { id: roomId, from: 'reminder' } });
    else setPendingReminderRoom(roomId);
  }, [response, loading, signedIn, router]);

  // N-1: `moment:///` while signed in pops back to Rooms (or replaces the top screen with it when
  // Rooms is not in the stack) instead of pushing another Rooms. P-3: with Invite or Upgrade open,
  // the modal is closed first, and a join link opens from Rooms like a reminder tap (C-3).
  // Signed out, cold start, or a join link with no modal open: default handling.
  const navigationRef = useNavigationContainerRef();
  useEffect(() => {
    if (loading || !signedIn) return;
    setRootLinkHandler({
      isModalOpen: () => navigationRef.isReady() && hasOpenModal(navigationRef.getRootState()),
      reset: (modalOpen) => resetToRoot(router, '/', modalOpen),
      // joinLinkHref only returns `/join/<token>`, a typed route.
      openFromRoot: (href) => pushFromRoot(router, href as Href),
    });
    return () => setRootLinkHandler(null);
  }, [loading, signedIn, router, navigationRef]);

  if (loading) return null;

  return (
    <>
    {/* UX P1-13: the status bar follows the color scheme (light text in dark mode) on every stack, modals included. */}
    <StatusBar style="auto" />
    <LocationReporters />
    {/* Spec 11 polish: a screen that opened as the root (deep link, cold start, Fast Refresh) has no Back, so it
        gets a way home instead of a dead end. */}
    <Stack
      screenOptions={({ route, navigation }) => ({
        headerLargeTitle: false,
        headerBackButtonDisplayMode: 'minimal',
        ...(!ROOT_SCREENS.has(route.name) && !navigation.canGoBack() ? { headerLeft: () => <HomeHeaderButton /> } : {}),
      })}
    >
      <Stack.Protected guard={signedIn} redirectTo="/welcome">
        {/* Tab roots (Today `/`, Explore, Qrews, Moments `/calendar`): the tab navigator draws their headers. */}
        <Stack.Screen name="(tabs)" options={{ title: en.home.title, headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: en.profile.title, headerTitle: '' }} />
        <Stack.Screen name="profile-edit" options={{ title: en.profile.editProfile, headerTitle: '' }} />
        {/* Redirect to the Qrews tab. */}
        <Stack.Screen name="connect/index" options={{ headerShown: false }} />
        <Stack.Screen name="connect/codes" options={{ title: 'My QR codes', headerTitle: '' }} />
        <Stack.Screen name="connect/code/[app]" options={{ title: '', headerTitle: '' }} />
        <Stack.Screen name="connect/person/[userId]" options={{ title: '', headerTitle: '' }} />
        {/* Modal screens (upgrade, room/[id]/invite, ask, questions): keep MODAL_ROUTES in lib/root-link.ts in sync (P-3). */}
        <Stack.Screen name="upgrade" options={{ title: en.upgrade.title, headerTitle: '', presentation: 'modal' }} />
        <Stack.Screen name="pick-character" options={{ title: en.profile.pickCharacterTitle, headerTitle: '', presentation: 'modal' }} />
        <Stack.Screen name="plan-preview" options={{ title: en.planPreview.title, headerTitle: '' }} />
        <Stack.Screen name="calendar-event" options={{ title: en.calendar.newEvent, headerTitle: '' }} />
        <Stack.Screen name="create-room" options={{ title: en.createRoom.title, headerTitle: '' }} />
        <Stack.Screen name="join/index" options={{ title: en.join.title, headerTitle: '' }} />
        <Stack.Screen name="scan" options={{ title: en.scan.title, headerTitle: '' }} />
        {/* Tropop: the handwritten title is in the content (QScreen); the nav bar keeps only Back. */}
        <Stack.Screen name="preview" options={{ title: en.preview.title, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="room/[id]/info" options={{ title: en.room.info, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/gallery" options={{ title: en.media.title, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/camera-off" options={{ title: en.cameraOff.title, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/map" options={{ title: en.map.title, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/end-activity" options={{ title: en.endActivity.title, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/end-room" options={{ title: en.endRoom.title, headerTitle: '' }} />
        <Stack.Screen name="room/[id]/face" options={{ title: en.face.title }} />
        <Stack.Screen name="room/[id]/media/[mediaId]" options={{ title: '', animation: reduceMotion ? 'fade' : 'default' }} />
        <Stack.Screen name="room/[id]/invite" options={{ title: en.invite.title, presentation: 'modal' }} />
        {/* Spec 10.4: the private Ask Trok chat opens as a sheet over the room. */}
        <Stack.Screen name="room/[id]/ask" options={{ title: en.qrewing.ask.title, presentation: 'modal' }} />
        <Stack.Screen name="room/[id]/questions" options={{ title: en.questions.title, presentation: 'modal' }} />
      </Stack.Protected>

      {/* QR deep link moment://join/<token>; handles both signed-in and signed-out users. */}
      <Stack.Screen name="join/[token]" options={{ headerShown: false }} />

      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="welcome" options={{ title: en.appName, headerShown: false }} />
        {/* Item 10: signed-out Join → code / QR → name; the invite opens from Rooms after sign-in. */}
        <Stack.Screen name="start/code" options={{ title: en.join.title, headerTitle: '' }} />
        <Stack.Screen name="start/scan" options={{ title: en.scan.title, headerTitle: '' }} />
        <Stack.Screen name="guest" options={{ title: en.guest.title, headerTitle: '' }} />
        <Stack.Screen name="sign-in" options={{ title: en.signIn.title, headerTitle: '' }} />
        <Stack.Screen name="sign-up" options={{ title: en.signUp.title, headerTitle: '' }} />
      </Stack.Protected>
    </Stack>
    </>
  );
}

export default function RootLayout() {
  // Spec 10.5: mirrors the access token and active room into the Keychain item the Siri intent reads.
  useEffect(() => startSiriMirror(), []);
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
