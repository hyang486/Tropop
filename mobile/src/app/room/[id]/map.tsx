import { AppleMaps, type CameraMoveEvent } from 'expo-maps';
import { SymbolView } from 'expo-symbols';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { AccessibilityInfo, ActivityIndicator, Alert, AppState, Linking, Platform, Pressable, ScrollView, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { HandTitle } from '@/components/hand-title';
import { EmergencyAlerts, useEmergencyPresence } from '@/components/room-activity';
import { dismissEmergencyConfirmForEnd, EmergencyConfirmHost } from '@/components/emergency-confirm';
import { RoomEnded } from '@/components/room-ended';
import { RouteEditor } from '@/components/route-editor';
import { QLink } from '@/components/q-screen';
import { Button, colors, Hint, radius, useLift, usePalette } from '@/components/ui';
import { InkSwitch } from '@/features/event/ink-switch';
import { PaceCard } from '@/features/pace/pace-card';
import { type PersonGap, personGap } from '@/features/pace/pace-core';
import { PaceLayer } from '@/features/pace/pace-layer';
import { en } from '@/i18n/en';
import { useRoomActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  getMyPosition,
  hasForegroundPermission,
  hasReducedAccuracy,
  locateMe,
  type Presence,
  requestForegroundPermission,
  saveRoute,
  setActivityState,
  setLocationAllowed,
  setShareLocation,
  useLivePresence,
  useMyShare,
  useSharingState,
} from '@/lib/location';
import { useAvatarPinIcons } from '@/lib/avatar-pins';
import {
  avatarPillAnchor,
  type Camera,
  fitRoomCamera,
  formatAge,
  formatRouteKm,
  formatSpeedKmh,
  isStale,
  type LabelPin,
  memberStatusLabels,
  type LatLng,
  MAX_CAMERA_ZOOM,
  parseRoute,
  type PinInput,
  planAvatarPins,
  planPins,
  presenceView,
  sharingNowEntries,
  ROOM_MAP_SIZE,
  ROUTE_LINE_WIDTH,
  stalePinId,
  type ViewSize,
} from '@/lib/location-plan';
import { sharedAge } from '@/lib/media-plan';
import { useRoomEvents } from '@/lib/room-channel';
import { getRoom, listMembers, type Room } from '@/lib/rooms';
import { classifySend } from '@/lib/send-room';
import { mapStartCamera } from '@/lib/map-start';
import { editorStartCamera, regionalDefaultCamera } from '@/lib/route-editor-plan';
import { useNow } from '@/lib/use-now';
import { useRoomOver } from '@/lib/use-room-over';

type State =
  | { status: 'loading' }
  | { status: 'gone' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: Room; names: Map<string, string>; avatars: Map<string, string | null> };

// P2: the member label pill. Fixed light colors (not the app theme) so it reads the same on light and dark maps.
const LABEL_BACKGROUND = '#FFFFFF';
const LABEL_TEXT = '#000000';
const LABEL_STALE_TEXT = '#6C6C70';
// UX2-35: the 34 pt overlay buttons reach 44 pt tall without growing.
const OVERLAY_HIT_SLOP = { top: 5, bottom: 5 };
// #1: an Emergency sender's pin and pill (fixed system red, readable on light and dark maps).
/** UX P0-3: pins never show a photo (the mockup shows initials). */
const NO_ICONS: ReadonlyMap<string, null> = new Map<string, null>();
type MapProperties = NonNullable<ComponentProps<typeof AppleMaps.View>['properties']>;
/**
 * UX3-B11: Apple's muted map style (flat; points of interest stay, R-1) so the full-color map doesn't fight the ink
 * theme, in light and dark. expo-maps' entry doesn't export the emphasis enum, so its string value is used.
 */
const MAP_STYLE: MapProperties = {
  emphasis: 'MUTED' as NonNullable<MapProperties['emphasis']>,
  elevation: AppleMaps.MapStyleElevation.FLAT,
};

export default function RoomMapScreen() {
  // F-EMX8: the Emergency confirm lives above the map / ended switch so it can close when the room ends.
  return (
    <>
      <RoomMapScreenBody />
      <EmergencyConfirmHost />
    </>
  );
}

function RoomMapScreenBody() {
  // focus: an Emergency sender to center on (Q 04.04 "Open last shared location" from chat, Photos or Info).
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const room = await getRoom(id);
      if (!room) {
        setState({ status: 'gone' });
        return;
      }
      const members = await listMembers(id);
      setState({
        status: 'ready',
        room,
        names: new Map(members.map((m) => [m.user_id, m.display_name])),
        avatars: new Map(members.map((m) => [m.user_id, m.avatar_path])),
      });
    } catch (e) {
      setState((s) => (s.status === 'ready' ? s : { status: 'error', message: errorMessage(e) }));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Location setting, activity state, route and membership all live on rooms / room_members. Sweep fix 2: notices
  // missed while the socket was down are caught up when the channel rejoins (SUBSCRIBED) and on return to foreground.
  // The first SUBSCRIBED for this room is skipped: the focus load above already read it (no double fetch on open).
  const joinedRoom = useRef<string | null>(null);
  useRoomEvents(
    id,
    (event) => {
      if (event.table === 'rooms' || event.table === 'room_members') load();
    },
    (status) => {
      if (status !== 'SUBSCRIBED') return;
      if (joinedRoom.current === id) load();
      else joinedRoom.current = id;
    },
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  // G-U6-1: the room's end time passing while Map is open (the host's End arrives as a rooms notice above).
  const ended = useRoomOver(state.status === 'ready' ? state.room : null);
  useEffect(() => {
    if (ended.over) dismissEmergencyConfirmForEnd();
  }, [ended.over]);
  const noHeaderQ = <Stack.Screen options={{ headerRight: () => null }} />;

  if (state.status === 'loading') return <ActivityIndicator style={styles.loading} />;
  // Q 06.04: the row is gone, so no closed-at time is known.
  if (state.status === 'gone') {
    return (
      <>
        {noHeaderQ}
        <RoomEnded />
      </>
    );
  }
  // No stale map, pins or sharing controls once the room is over.
  if (state.status === 'ready' && ended.over) {
    return (
      <>
        {noHeaderQ}
        <RoomEnded room={state.room} nowMs={ended.nowMs} />
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Hint tone="error">{state.message}</Hint>
        <Button title={en.home.retry} variant="secondary" onPress={load} />
      </View>
    );
  }
  return <RoomMap room={state.room} names={state.names} avatars={state.avatars} focus={focus} reload={load} />;
}

function RoomMap({
  room,
  names,
  avatars,
  focus,
  reload,
}: {
  focus?: string;
  /** Hidden-state sweep: re-read the room after a host change, so a missed realtime notice cannot leave it stale. */
  reload: () => void;
  room: Room;
  names: Map<string, string>;
  avatars: Map<string, string | null>;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const reduceTransparency = useReduceTransparency();
  const userId = session?.user.id;
  const isHost = room.host_id === userId;
  const now = useNow(15_000);
  const mapRef = useRef<AppleMaps.MapView>(null);

  const allowed = room.location_allowed;
  const active = allowed && room.activity_state === 'active';

  const my = useMyShare(room.id, userId);
  // #1: open Emergencies show on Map too (banner above the map, red pin and pill for the sender).
  const activity = useRoomActivity(room.id, userId, room.activity_seq);
  const emergencyPinIds = new Set(activity.emergencies.flatMap((e) => [e.userId, stalePinId(e.userId)]));
  // V4: members who answered On my way get a walker badge on their pin.
  const onWayPinIds = new Set(activity.emergencies.flatMap((e) => e.onWay.flatMap((id) => [id, stalePinId(id)])));
  // #2: each member's current status, on their pill line and in their "Sharing now" row.
  const statusOf = memberStatusLabels(activity.memberStatus, activity.statuses);
  const [busy, setBusy] = useState<string | null>(null);
  // M2: the app-level LocationReporters does the reporting; this screen only reads its state.
  const sharingState = useSharingState(room.id);
  // UX2-38: the route is ink (light) / #EDEDE8 (dark), the same as the editor.
  const pal = usePalette();
  const routeColor = pal.ink;

  // M5: the permission is read again whenever the app returns to the foreground (e.g. from Settings).
  const [granted, setGranted] = useState<boolean | null>(null);
  const [askDenied, setAskDenied] = useState(false);
  const [locate, setLocate] = useState<'idle' | 'busy' | 'denied' | 'settings' | 'unavailable'>('idle');
  // UX2-21: Precise Location off feeds coarse dots to pace and arrival, so the map says so.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    const check = () => {
      hasForegroundPermission()
        .then((ok) => {
          if (!live) return;
          setGranted(ok);
          // Sweep fix 3: access turned on in Settings clears the denied hint and Open Settings on return.
          if (ok) {
            setAskDenied(false);
            setLocate((l) => (l === 'denied' || l === 'settings' ? 'idle' : l));
          }
        })
        .catch(() => {});
      hasReducedAccuracy()
        .then((r) => {
          if (live) setReduced(r);
        })
        .catch(() => {});
    };
    check();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  const permissionDenied = granted === false && (askDenied || sharingState === 'no-permission');

  const presence = useLivePresence(room.id, active);
  // C39: the Emergency bar reads presence while an Emergency is open, with or without an activity (the same source
  // as chat), so its location line never waits on `active` and stays on Checking.
  const emergencyPresence = useEmergencyPresence(room.id, activity);
  // P0: a member in Emergency is pinned to the top of "Sharing now" and never dropped, with or without a row.
  // ux: the person in Emergency never sees her own alert row; her own line is under the share switch instead.
  const sharingNow = sharingNowEntries(
    presence.rows,
    activity.emergencies.filter((e) => e.userId !== userId).map((e) => e.userId),
  );
  const meInEmergency = activity.emergencies.some((e) => e.userId === userId);
  const presenceState = presenceView({ loaded: presence.loaded, error: presence.error, count: sharingNow.length });
  const savedRoute = useMemo(() => parseRoute(room.route), [room.route]);
  // R1-C: the host edits the route in a full-screen editor (a Modal outside the stack, with its own map).
  // Holds where the editor's map opens, captured when it opens; null when not editing.
  const [editor, setEditor] = useState<{ start: Camera | null } | null>(null);
  const shownRoute = savedRoute;
  // #10: the route length on the map (top left, after Pen); hidden with fewer than 2 points.
  const routeKm = useMemo(() => formatRouteKm(shownRoute), [shownRoute]);

  // F5-5b: the map's real size once it is laid out (the fit and the label grouping measure against it).
  const [mapSize, setMapSize] = useState<ViewSize>(ROOM_MAP_SIZE);
  // The room map's view after its last camera move: the editor opens on the same view.
  const lastView = useRef<Camera | null>(null);
  function onCameraMove(event: CameraMoveEvent) {
    const { latitude, longitude } = event.coordinates;
    if (latitude == null || longitude == null) return;
    lastView.current = { coordinates: { latitude, longitude }, zoom: event.zoom };
  }

  // UX P0-3: every member is a 34 pt avatar pin (you ink-filled, others white with an ink initial); people within
  // 30 m of each other are one "+N" pin (ink-filled when it includes you), never a person in Emergency. Only a
  // person in Emergency gets a red ring and a "<name> · help" label right under the pin. Tapping a pin shows its
  // names in a callout pill above it; tapping the map hides it. Stale pins are grey.
  const pinInputs: PinInput[] = presence.rows.map((row) => ({
    userId: row.user_id,
    coordinates: { latitude: row.lat, longitude: row.lng },
    updatedAt: row.updated_at,
    speedMps: row.speed_mps,
    label: displayName(row, userId, names),
    initialsOf: names.get(row.user_id) ?? '',
    avatarPath: null,
    status: statusOf.get(row.user_id) ?? null,
  }));
  const pins = planPins(pinInputs, now, NO_ICONS, en.map.stalePin);
  const avatarPins = planAvatarPins(pins, pinInputs, userId, emergencyPinIds, undefined, onWayPinIds);
  const pinIcons = useAvatarPinIcons(avatarPins.map((pin) => pin.face));
  const labelInputs: LabelPin[] = avatarPins.flatMap((pin) =>
    pin.face.emergency
      ? [{ id: pin.id, coordinates: pin.coordinates, shape: 'photo' as const, text: en.map.emergencyPin(pin.names[0]), stale: false }]
      : [],
  );
  const pinAnnotations = avatarPins.map((pin) => {
    const icon = pinIcons.icons.get(pin.faceKey);
    // Until its icon is baked (or if baking failed), a pin is a plain white pill with its initial.
    return icon
      ? { id: pin.id, coordinates: pin.coordinates, icon }
      : { id: pin.id, coordinates: pin.coordinates, text: pin.face.text, backgroundColor: LABEL_BACKGROUND, textColor: LABEL_TEXT };
  });
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const selected = avatarPins.find((pin) => pin.id === selectedPin) ?? null;
  // VoiceOver: expo-maps annotations take no accessibility label, so the map reads out its pins as one label.
  // Each member reads "<Name>, <time> ago" from their last position update.
  const updatedAt = new Map(pinInputs.map((input) => [input.userId, input.updatedAt]));
  const spokenMember = (memberId: string, name: string) => {
    const at = updatedAt.get(memberId.replace(/:stale$/, ''));
    const age = at ? sharedAge(at, now) : null;
    return en.map.pinSpoken(name, age ? en.media.age(age.n, age.unit) : null);
  };
  const pinsSpoken = avatarPins
    .map((pin) =>
      pin.face.emergency
        ? spokenMember(pin.members[0], en.map.emergencyPin(pin.names[0]))
        : pin.members.map((id, i) => spokenMember(id, pin.names[i] ?? '')).join(', '),
    )
    .join('; ');

  // M6: with no route or positions yet, the map starts on the user's own position (no prompt).
  const [myPosition, setMyPosition] = useState<LatLng | null>(null);
  useEffect(() => {
    if (!granted) return;
    let live = true;
    getMyPosition().then((pos) => {
      if (live && pos) setMyPosition(pos);
    });
    return () => {
      live = false;
    };
  }, [granted]);

  // Center once on the first route or position (or, until there is one, on the user's own position);
  // after that only the Recenter button moves the camera. F5-3: the zoom fits the points' span.
  // F5-4: the first centering goes through the cameraPosition prop, which expo-maps applies once the
  // native view exists; an imperative call right after mount could reject ("Unable to find the view").
  // F5-5b: the fit keeps the points clear of the overlay buttons and of the pins' own icons and labels,
  // measured against the map's real size once it is laid out.
  // P2: the fit also leaves room for the member labels it will draw (grouped pills grow downward).
  // Cheap (a few pins), so it is recomputed on each render rather than memoized on the per-render pin list.
  const pointsCamera = fitRoomCamera(
    [...savedRoute, ...presence.rows.map((r) => ({ latitude: r.lat, longitude: r.lng }))],
    labelInputs,
    mapSize,
    shownRoute,
  );
  // UX P1-8: never the world view. Live positions, else the meeting place, else the route, else my position,
  // else a regional default (see map-start).
  // UX P1-9: my own position for the people list: my shared row, else the one-off position read above.
  const myRow = presence.rows.find((r) => r.user_id === userId);
  const meNow = myRow ? { latitude: myRow.lat, longitude: myRow.lng } : myPosition;
  const place = room.place_name && room.place_lat != null && room.place_lng != null
    ? { latitude: room.place_lat, longitude: room.place_lng }
    : null;
  const start = mapStartCamera({
    livePointsCamera: presence.rows.length > 0 ? pointsCamera : null,
    place,
    routeCamera: savedRoute.length > 0 ? pointsCamera : null,
    mine: myPosition,
    regional: regionalDefaultCamera(Intl.DateTimeFormat().resolvedOptions().timeZone),
    maxZoom: MAX_CAMERA_ZOOM,
  });
  const camera = start.camera;
  const [initialCamera, setInitialCamera] = useState<Camera | null>(null);
  // The rank of the camera the map opened on; only a higher rank (a better start) replaces it, and rank 3 is final.
  const centeredOn = useRef(0);
  useEffect(() => {
    if (start.rank <= centeredOn.current) return;
    centeredOn.current = start.rank;
    // A one-time snapshot: later moves of the points must not move the camera.
    setInitialCamera(start.camera);
  }, [start.rank, start.camera]);

  function recenter() {
    if (camera) mapRef.current?.setCameraPosition(camera).catch(() => {});
  }

  // Q 04.04: "Open last shared location" centers on the Emergency sender's last position. Opened from another
  // screen (focus param), it centers once when that row arrives (an imperative move right after mount can be
  // rejected, F5-4, so the camera prop is set too).
  function focusOn(coordinates: LatLng) {
    mapRef.current?.setCameraPosition({ coordinates, zoom: MAX_CAMERA_ZOOM }).catch(() => {});
  }
  const focusRow = focus ? presence.rows.find((r) => r.user_id === focus) : undefined;
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !focusRow) return;
    focused.current = true;
    const coordinates = { latitude: focusRow.lat, longitude: focusRow.lng };
    // Both: the prop covers a map that is not ready yet, the call a map that already applied its first camera.
    centeredOn.current = 3;
    setInitialCamera({ coordinates, zoom: MAX_CAMERA_ZOOM });
    focusOn(coordinates);
  }, [focusRow]);

  // F5-1: "Show my location" works with Share off. The permission prompt comes only from this tap;
  // the position is read once, kept on this screen, and never sent (no RPC, no sharing-store change).
  const [showingMine, setShowingMine] = useState(false);
  async function showMyLocation() {
    if (locate === 'busy') return;
    setLocate('busy');
    const result = await locateMe();
    if (result.kind === 'denied') {
      setGranted(false);
      setShowingMine(false);
      setLocate(result.canAskAgain ? 'denied' : 'settings');
      return;
    }
    if (result.kind === 'unavailable') {
      setLocate('unavailable');
      return;
    }
    setGranted(true);
    setMyPosition(result.position);
    setShowingMine(true);
    setLocate('idle');
    mapRef.current
      ?.setCameraPosition({ coordinates: result.position, zoom: MAX_CAMERA_ZOOM })
      .catch(() => {});
  }

  async function run(key: string, action: () => Promise<void>, refresh = false) {
    setBusy(key);
    try {
      await action();
      if (refresh) reload();
    } catch (e) {
      // F-EM-EXP: an ended room is not a retryable failure: say so (announced) and let the room switch to ended.
      if ((await classifySend(room.id, e, room)) === 'ended') {
        AccessibilityInfo.announceForAccessibility(en.errors.ended);
        reload();
        return;
      }
      // UX2-91: a title, the reason, and Try again that reruns the same action.
      Alert.alert(en.map.actionFailedTitle, errorMessage(e), [
        { text: en.map.cancel, style: 'cancel' },
        { text: en.map.tryAgain, onPress: () => void run(key, action, refresh) },
      ]);
    } finally {
      setBusy(null);
    }
  }

  // C1: the device permission comes first, so the reporter never starts without it and undoes the opt-in.
  function toggleShare(next: boolean) {
    run('share', async () => {
      if (next) {
        const ok = await requestForegroundPermission();
        setGranted(ok);
        setAskDenied(!ok);
        if (!ok) return;
      }
      await setShareLocation(room.id, next);
      my.setShareLocal(next);
    });
  }

  function toggleAllowed(next: boolean) {
    if (next) {
      run('allowed', () => setLocationAllowed(room.id, true), true);
      return;
    }
    Alert.alert(active ? en.map.endConfirmTitle : en.map.stopSharingTitle, active ? en.map.allowLocationHint : en.map.stopSharingBody, [
      { text: en.map.cancel, style: 'cancel' },
      { text: active ? en.map.endActivity : en.map.stopSharing, style: 'destructive', onPress: () => run('allowed', () => setLocationAllowed(room.id, false), true) },
    ]);
  }

  function toggleActivity() {
    if (!active) {
      run('activity', () => setActivityState(room.id, 'active'), true);
      return;
    }
    // Tropop unit 4 (Q 03.04): a confirm screen that states the effects, instead of an alert.
    router.push({ pathname: '/room/[id]/end-activity', params: { id: room.id } });
  }

  function openEditor() {
    // UI v2 (2): never the world view; with no room points or my position, a regional default.
    setEditor({
      start: editorStartCamera({
        lastView: lastView.current,
        roomCamera: camera,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
  }

  function saveEdited(route: LatLng[]) {
    run('route', async () => {
      await saveRoute(room.id, route);
      setEditor(null);
    }, true);
  }

  // Emergency labels only: red text on a white pill directly under the pin (red stays the one Emergency
  // signal). qa (P0-3): the grouped label layout placed it ~60 pt off the 34 pt pin.
  const annotations = [
    ...pinAnnotations,
    ...avatarPins.flatMap((pin) =>
      pin.face.emergency
        ? [
            {
              id: `${pin.id}:emergency`,
              coordinates: pin.coordinates,
              text: en.map.emergencyPin(pin.names[0]),
              anchor: avatarPillAnchor(1, 'below'),
              backgroundColor: pal.lift,
              textColor: pal.errorText,
            },
          ]
        : [],
    ),
    ...(selected
      ? [
          {
            id: `callout:${selected.id}`,
            coordinates: selected.coordinates,
            text: selected.titles.join('\n'),
            anchor: avatarPillAnchor(selected.titles.length, 'above'),
            backgroundColor: LABEL_BACKGROUND,
            textColor: selected.face.stale ? LABEL_STALE_TEXT : LABEL_TEXT,
          },
        ]
      : []),
  ];

  // Own position on the map only when the permission is already granted and Share or Show my location is on.
  // Nothing here asks for the permission (only the Share switch and Show my location do).
  const showsMyLocation = granted === true && (my.share || showingMine);

  const reporterText = en.map.reporter[sharingState];
  // UX2-59: "Map" moves into the nav bar once the large title scrolls under the header.
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // V4: a fixed lift sheet (about 45% of the screen) that scrolls inside; the map fills the screen behind it.
  const sheetHeight = Math.round(windowHeight * 0.45);
  const reporterIsError = sharingState === 'error' || sharingState === 'no-permission'; // UX2-32: 'refused' is a normal event (ink2)

  return (
    // Trok pace maker: its cue banner and stationary sheet sit over the map (PaceLayer).
    <View style={styles.root}>
      {/* V4: the map is full bleed under the header and ends at the sheet's top edge, so MapKit's Apple Maps logo and
          Legal link (bottom corners; expo-maps has no padding prop for Apple Maps) stay visible. */}
      <View
        style={[styles.mapFill, { bottom: sheetHeight }]}
        accessibilityLabel={pinsSpoken ? `${en.map.title}: ${pinsSpoken}` : undefined}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0 && (width !== mapSize.width || height !== mapSize.height)) {
            setMapSize({ width, height });
          }
        }}
      >
        <AppleMaps.View
          ref={mapRef}
          style={styles.map}
          cameraPosition={initialCamera ?? undefined}
          annotations={annotations}
          polylines={
            shownRoute.length > 1
              ? [{ id: 'route', coordinates: shownRoute, color: routeColor, width: ROUTE_LINE_WIDTH }]
              : []
          }
          properties={{ ...MAP_STYLE, isMyLocationEnabled: showsMyLocation }}
          onCameraMove={onCameraMove}
          onAnnotationClick={(event) => {
            const id = event.id ?? '';
            if (id.startsWith('callout:')) setSelectedPin(null);
            else if (avatarPins.some((pin) => pin.id === id)) setSelectedPin((current) => (current === id ? null : id));
          }}
          onMapClick={() => setSelectedPin(null)}
        />
        {pinIcons.baker}
      </View>
      <Stack.Screen
        options={{
          title: en.map.title,
          headerTransparent: true,
          headerShadowVisible: false,
          headerTitle: () => (
            <MapGlass style={styles.titlePill}>
              <MapTitle />
            </MapGlass>
          ),
          // F-RT1: with Reduce Transparency the native back button reads near-white in dark mode, so draw our own.
          ...(reduceTransparency && router.canGoBack()
            ? {
                // iOS 26 wraps a header item in a shared bar-button background that turns opaque under RT (a second,
                // wider pill around our circle); hidesSharedBackground removes it so only our circle shows.
                unstable_headerLeftItems: () => [
                  {
                    type: 'custom' as const,
                    hidesSharedBackground: true,
                    element: (
                      <Pressable accessibilityRole="button" accessibilityLabel={en.room.back} onPress={() => router.back()}>
                        <MapGlass style={styles.circle}>
                          <MapBackChevron />
                        </MapGlass>
                      </Pressable>
                    ),
                  },
                ],
              }
            : {}),
        }}
      />
      {/* V4: the Emergency capsule (16 pt from the sides) and the host's route chips float under the header. */}
      <View style={[styles.topOverlay, { top: headerHeight + 8 }]} pointerEvents="box-none">
        <EmergencyAlerts
          place="map"
          roomId={room.id}
          activity={activity}
          userId={userId}
          names={names}
          presence={emergencyPresence}
          onOpenLocation={(_sender, coordinates) => focusOn(coordinates)}
        />
        {isHost || routeKm ? (
          <View style={styles.topLeft} pointerEvents="box-none">
            {isHost ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={savedRoute.length > 0 ? en.map.editRoute : en.map.drawRoute}
                onPress={openEditor}
                hitSlop={OVERLAY_HIT_SLOP}
                style={[styles.chip, styles.pen]}
              >
                <SymbolView name="pencil.tip" size={18} tintColor={colors.label} />
                <Text style={styles.link} numberOfLines={1} maxFontSizeMultiplier={MAP_OVERLAY_MAX_SCALE}>
                  {savedRoute.length > 0 ? en.map.editRoute : en.map.drawRoute}
                </Text>
              </Pressable>
            ) : null}
            {routeKm ? (
              <View style={[styles.chip, styles.distanceChip]}>
                <Text style={styles.distance} numberOfLines={1} maxFontSizeMultiplier={MAP_OVERLAY_MAX_SCALE}>{en.map.routeDistance(routeKm)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {/* V4: Show my location / Recenter, 44 pt glass circles on the right, 12 pt apart, above the sheet. */}
      <View style={[styles.circles, { bottom: sheetHeight + 12 }]} pointerEvents="box-none">
        {start.rank > 1 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={en.map.recenter} onPress={recenter}>
            <MapGlass style={styles.circle}>
              <SymbolView name="scope" size={20} weight="semibold" tintColor={colors.label} />
            </MapGlass>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={locate === 'busy' ? en.map.locating : en.map.showMine}
          accessibilityState={{ busy: locate === 'busy' }}
          onPress={showMyLocation}
        >
          <MapGlass style={styles.circle}>
            {locate === 'busy' ? (
              <ActivityIndicator />
            ) : (
              <SymbolView name="location" size={20} weight="semibold" tintColor={colors.label} />
            )}
          </MapGlass>
        </Pressable>
      </View>

      <View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.sheetClip}>
          <View style={styles.grabber} accessible={false} />
          <ScrollView
            contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {reduced && granted !== false ? (
              <View style={styles.preciseBar}>
                <Text style={styles.preciseText}>{en.map.preciseOff}</Text>
                <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={8} style={styles.preciseLink}>
                  <Text style={styles.preciseLinkText}>{en.map.openSettings}</Text>
                </Pressable>
              </View>
            ) : null}
            {/* UX2-87 (pattern P): an ink2 line and Open Settings, not red. */}
            {locate === 'denied' || locate === 'settings' ? (
              <>
                <Hint>{en.pace.locationOff}</Hint>
                <Button title={en.map.openSettings} variant="secondary" onPress={() => Linking.openSettings()} />
              </>
            ) : null}
            {locate === 'unavailable' ? <Hint tone="error">{en.map.locateUnavailable}</Hint> : null}
            {showingMine && !my.share ? <Hint>{en.map.showMineHint}</Hint> : null}

            {active ? (
              <View style={styles.group}>
                <View style={styles.sheetHead}>
                  <Text style={styles.status} accessibilityRole="header">{en.map.members}</Text>
                  <Text style={styles.sheetCount}>{en.map.sharingCount(presence.rows.length, Math.max(names.size, presence.rows.length))}</Text>
                </View>
                {presenceState === 'loading' ? <Hint>{en.map.presenceLoading}</Hint> : null}
                {presenceState === 'empty' ? <Hint>{en.map.nobody}</Hint> : null}
                {presenceState === 'error' ? <Hint tone="error">{en.map.presenceFailed}</Hint> : null}
                {/* UX2-117: rows already shown stay; one ink2 line says they may be old. */}
                {presenceState === 'rows' && presence.error ? <Hint>{en.map.presenceStale}</Hint> : null}
                {presence.error ? (
                  <Button title={en.map.tryAgain} variant="secondary" onPress={() => void presence.reload()} />
                ) : null}
                {/* P0: Emergency members on top and never dropped (sharingNowEntries), in the V4 row style. */}
                {sharingNow.map(({ userId: memberId, row, emergency }, i) => (
                  <View key={memberId}>
                    {i > 0 ? <View style={styles.rowLine} /> : null}
                    <PresenceRow
                      gap={
                        !row || memberId === userId
                          ? null
                          : personGap(meNow, { latitude: row.lat, longitude: row.lng }, savedRoute)
                      }
                      row={row}
                      name={memberName(memberId, userId, names)}
                      initialOf={names.get(memberId) ?? ''}
                      avatarPath={avatars.get(memberId) ?? null}
                      status={statusOf.get(memberId) ?? null}
                      emergency={emergency}
                      now={now}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.group}>
              {!active ? (
                <Text style={styles.status} accessibilityRole="header">{en.map.activityIdle}</Text>
              ) : null}
              {/* UX2-41: the host has the switch below, so no line. */}
              {!allowed ? (isHost ? null : <Hint>{en.map.notAllowed}</Hint>) : !active ? <Hint>{en.map.activityIdleHint}</Hint> : null}
              {allowed ? (
                <>
                  {my.unknown ? (
                    <>
                      {/* UX2-86 (C15): my share is unknown, so no switch that might lie. */}
                      <Hint tone="error">{en.map.shareUnknown}</Hint>
                      <Button title={en.map.tryAgain} variant="secondary" onPress={() => void my.reload()} />
                      <QLink title={en.map.stopSharing} onPress={() => toggleShare(false)} />
                    </>
                  ) : (
                    <>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{en.map.shareMine}</Text>
                        <InkSwitch
                          value={my.share}
                          disabled={busy === 'share'}
                          onValueChange={toggleShare}
                          accessibilityLabel={en.map.shareMine}
                          accessibilityHint={meInEmergency && !my.share ? en.map.shareInEmergency : undefined}
                        />
                      </View>
                      <Hint>{en.map.shareMineHint}</Hint>
                      {meInEmergency && !my.share ? <Text style={styles.shareEmergency} importantForAccessibility="no" accessibilityElementsHidden>{en.map.shareInEmergency}</Text> : null}
                    </>
                  )}
                  {permissionDenied ? (
                    <>
                      {/* UX2-87: one block for sharing and the pace maker (the pace card has none of its own). */}
                      <Hint>{en.map.locationOffShare}</Hint>
                      <Button title={en.map.openSettings} onPress={() => Linking.openSettings()} />
                    </>
                  ) : reporterText ? (
                    <Hint tone={reporterIsError ? 'error' : 'normal'}>{reporterText}</Hint>
                  ) : null}
                </>
              ) : null}
            </View>

            {isHost ? (
              <View style={styles.group}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{en.map.allowLocation}</Text>
                  <InkSwitch
                    value={allowed}
                    disabled={busy === 'allowed'}
                    onValueChange={toggleAllowed}
                    accessibilityLabel={en.map.allowLocation}
                  />
                </View>
                <Hint>{en.map.allowLocationHint}</Hint>
                {allowed ? (
                  // Unit 4 F2 (work list B, Map host): Start / End activity is a card under the map, like Allow sharing.
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ busy: busy === 'activity', disabled: busy === 'activity' }}
                    disabled={busy === 'activity'}
                    onPress={toggleActivity}
                    style={({ pressed }) => [styles.switchRow, styles.cardRow, pressed && styles.pressed]}
                  >
                    {/* UX2-65: End activity ends sharing for everyone: red, no chevron (its confirm screen stays). */}
                    <Text style={[styles.switchLabel, active && { color: colors.errorText }]}>
                      {active ? en.map.endActivity : en.map.startActivity}
                    </Text>
                    {busy === 'activity' ? (
                      <ActivityIndicator />
                    ) : active ? null : (
                      <SymbolView name="chevron.right" size={14} weight="semibold" tintColor={colors.secondaryLabel} />
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <PaceCard room={room} share={my.share} userId={userId} />
          </ScrollView>
        </View>
      </View>

      {editor ? (
        <RouteEditor
          roomName={room.name}
          savedRoute={savedRoute}
          startCamera={editor.start}
          saving={busy === 'route'}
          showsMyLocation={showsMyLocation}
          memberMarkers={[]}
          memberPhotos={pinAnnotations}
          onCancel={() => setEditor(null)}
          onSave={saveEdited}
        />
      ) : null}
      <PaceLayer roomId={room.id} />
    </View>
  );
}

/** Follows the iOS Reduce Transparency setting. */
function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((v) => live && setReduce(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * V4: Liquid Glass for the Map title pill and the 44 pt circles; a lift fill with the lift shadow when glass is
 * unavailable or Reduce Transparency is on. (ui.tsx GlassIconButton lacks the Reduce Transparency fallback.)
 */
function MapGlass({ children, style }: { children: ReactNode; style: StyleProp<ViewStyle> }) {
  const reduce = useReduceTransparency();
  const lift = useLift();
  const pal = usePalette();
  if (Platform.OS === 'ios' && isLiquidGlassAvailable() && !reduce) {
    return <GlassView style={style}>{children}</GlassView>;
  }
  // F-RT1 (ux): opaque lift fill from the JS scheme (the header hosts this view natively, where a dynamic color can
  // resolve against the wrong appearance), a 0.5 pt hairline plus the lift shadow so it holds against the map.
  const edge = { borderWidth: 0.5, borderColor: 'rgba(48,43,40,0.08)' };
  return <View style={[style, { backgroundColor: pal.lift }, lift, edge]}>{children}</View>;
}

/** The Map title; its color comes from the JS scheme so it always matches the capsule fill. */
function MapTitle() {
  const pal = usePalette();
  return (
    <HandTitle style={[styles.titleText, { color: pal.ink }]} numberOfLines={1}>
      {en.map.title}
    </HandTitle>
  );
}

function MapBackChevron() {
  const pal = usePalette();
  return <SymbolView name="chevron.left" size={18} weight="semibold" tintColor={pal.ink} />;
}

function gapLabel(gap: PersonGap): string {
  if (gap.kind === 'with') return en.map.withYou;
  return gap.kind === 'behind' ? en.map.behind(gap.meters) : gap.kind === 'ahead' ? en.map.ahead(gap.meters) : en.map.away(gap.meters);
}

function displayName(row: Presence, userId: string | undefined, names: Map<string, string>) {
  return memberName(row.user_id, userId, names);
}

function memberName(memberId: string, userId: string | undefined, names: Map<string, string>) {
  return memberId === userId ? en.map.you : (names.get(memberId) ?? en.chat.formerMember);
}

/**
 * C4: a stale row never shows its speed; it shows its age instead. UX P1-9: a fresh row shows where the person is
 * relative to me ("0.2 km behind", "with you"), not "Updated just now" on every row; my own row shows my speed.
 */
function PresenceRow({
  gap,
  row,
  name,
  initialOf,
  avatarPath,
  status,
  emergency,
  now,
}: {
  gap: PersonGap | null;
  /** Null only for a member in Emergency with no position on the server (P0). */
  row: Presence | null;
  name: string;
  initialOf: string;
  avatarPath: string | null;
  status: string | null;
  emergency: boolean;
  now: number;
}) {
  if (emergency) {
    // P0: the red disc and "Needs help · <age of the last fix>"; the row stays even when the fix is old or missing.
    // Emergency events carry no location of their own, so a missing row reads "Location off".
    const fixAge = row ? formatAge(row.updated_at, now) : null;
    return (
      <View style={styles.presence} accessible accessibilityLabel={en.map.needsHelpSpoken(name, fixAge)}>
        <View style={styles.emergencyDisc}>
          <Text style={styles.emergencyInitial}>{(initialOf || name).slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.presenceText}>
          <Text style={styles.presenceName}>{name}</Text>
          <Text style={[styles.presenceMeta, styles.emergencyText]}>
            {en.map.needsHelp(fixAge)}
          </Text>
        </View>
      </View>
    );
  }
  if (!row) return null;
  const age = formatAge(row.updated_at, now);
  const stale = isStale(row.updated_at, now);
  const speed = stale ? null : formatSpeedKmh(row.speed_mps);
  // qa: my row has no gap and often no speed; no empty second line then (the name centers on the avatar).
  const meta = stale ? en.map.stale(age) : gap ? gapLabel(gap) : speed;
  return (
    <View style={styles.presence}>
      <Avatar path={avatarPath} name={initialOf || name} size={28} />
      <View style={styles.presenceText}>
        <Text style={styles.presenceName}>
          {name}
          {status ? <Text style={styles.presenceStatus}>{` · ${status}`}</Text> : null}
        </Text>
        {meta && stale ? (
          // C15: a stale row reads "Last seen 4 min ago" in ink2 with a clock (no orange).
          <View style={styles.staleRow}>
            <SymbolView name="clock" size={13} tintColor={colors.ink2} />
            <Text style={styles.presenceMeta}>{meta}</Text>
          </View>
        ) : meta ? (
          <Text style={styles.presenceMeta}>{meta}</Text>
        ) : null}
      </View>
    </View>
  );
}

// The buttons and chips on the 360 pt map stay on one line at the largest text sizes, so "Show my location" and
// "Recenter" never overlap (qa, largest Dynamic Type). The screen text around the map still scales fully.
const MAP_OVERLAY_MAX_SCALE = 1.3;
const styles = StyleSheet.create({
  edgeFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  // V4 (ux): lift behind the map's rounded bottom corners, so paper never shows there.
  root: { flex: 1, backgroundColor: colors.lift },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  loading: { marginTop: 48 },
  center: { padding: 20, gap: 12, alignItems: 'center' },
  titlePill: { height: 40, paddingHorizontal: 18, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  titleText: { fontSize: 20, lineHeight: 28 },
  topOverlay: { position: 'absolute', left: 16, right: 16, gap: 8 },
  circles: { position: 'absolute', right: 16, gap: 12 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // V4 (ux): the sheet is flush with the map's rounded bottom: square top corners, no shadow or hairline.
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.lift },
  sheetClip: { flex: 1, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 8, marginBottom: 4, backgroundColor: colors.wash2 },
  sheetContent: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sheetCount: { fontSize: 15, color: colors.ink2, fontVariant: ['tabular-nums'] },
  rowLine: { height: 1, marginLeft: 40, backgroundColor: colors.wash },
  map: { flex: 1 },
  mapFill: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  // Top left: MapKit's own controls (compass, pitch toggle, user location button) stack in the top right
  // corner, and expo-maps 58 cannot move them. The scale bar (top left) is off by default. Pen and the
  // route length sit in one row inside the top overlay band (ROOM_MAP_PADDING.top keeps the fit clear of it).
  topLeft: {
    marginRight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: { backgroundColor: colors.lift, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  pen: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distanceChip: { flexShrink: 1, pointerEvents: 'none' },
  distance: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.label, fontVariant: ['tabular-nums'] },
  group: { gap: 8 },
  status: { fontSize: 17, fontWeight: '600', color: colors.label },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.field,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  switchLabel: { fontSize: 17, color: colors.label, flexShrink: 1 },
  cardRow: { minHeight: 52, gap: 12 },
  pressed: { opacity: 0.6 },
  link: { fontSize: 17, color: colors.label },
  preciseBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12 },
  preciseText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  preciseLink: { minHeight: 44, justifyContent: 'center' },
  preciseLinkText: { fontSize: 13, lineHeight: 18, color: colors.tint },
  presence: {
    minHeight: 52,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presenceText: { flex: 1, gap: 2 },
  presenceName: { fontSize: 17, color: colors.label },
  presenceMeta: { fontSize: 15, color: colors.ink2, fontVariant: ['tabular-nums'] },
  staleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  presenceStatus: { color: colors.ink2 },
  emergencyText: { color: colors.errorText, fontWeight: '600' },
  shareEmergency: { fontSize: 13, color: colors.errorText },
  emergencyDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.errorText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyInitial: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});
