import { AppleMaps } from 'expo-maps';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  getMyPosition,
  hasForegroundPermission,
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
import {
  centerOf,
  formatAge,
  formatSpeedKmh,
  isStale,
  type LatLng,
  MAX_ROUTE_POINTS,
  parseRoute,
  type PinInput,
  planPins,
  wantedIconPaths,
} from '@/lib/location-plan';
import { useMarkerIcons } from '@/lib/marker-icons';
import { useRoomEvents } from '@/lib/room-channel';
import { getRoom, listMembers, type Room } from '@/lib/rooms';
import { useNow } from '@/lib/use-now';

type State =
  | { status: 'loading' }
  | { status: 'gone' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: Room; names: Map<string, string>; avatars: Map<string, string | null> };

const STALE_TINT = '#8E8E93';
const ROUTE_COLOR = '#007AFF';
const DRAFT_COLOR = '#FF9500';

export default function RoomMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  // Location setting, activity state, route and membership all live on rooms / room_members.
  useRoomEvents(id, (event) => {
    if (event.table === 'rooms' || event.table === 'room_members') load();
  });

  if (state.status === 'loading') return <ActivityIndicator style={styles.loading} />;
  if (state.status === 'gone') {
    return (
      <View style={styles.center}>
        <Text style={styles.goneTitle}>{en.room.gone}</Text>
        <Hint>{en.room.goneHint}</Hint>
      </View>
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
  return <RoomMap room={state.room} names={state.names} avatars={state.avatars} />;
}

function RoomMap({
  room,
  names,
  avatars,
}: {
  room: Room;
  names: Map<string, string>;
  avatars: Map<string, string | null>;
}) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const isHost = room.host_id === userId;
  const now = useNow(15_000);
  const mapRef = useRef<AppleMaps.MapView>(null);

  const allowed = room.location_allowed;
  const active = allowed && room.activity_state === 'active';

  const my = useMyShare(room.id, userId);
  const [busy, setBusy] = useState<string | null>(null);
  // M2: the app-level LocationReporters does the reporting; this screen only reads its state.
  const sharingState = useSharingState(room.id);

  // M5: the permission is read again whenever the app returns to the foreground (e.g. from Settings).
  const [granted, setGranted] = useState<boolean | null>(null);
  const [askDenied, setAskDenied] = useState(false);
  useEffect(() => {
    let live = true;
    const check = () =>
      hasForegroundPermission()
        .then((ok) => {
          if (live) setGranted(ok);
        })
        .catch(() => {});
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
  const savedRoute = useMemo(() => parseRoute(room.route), [room.route]);
  const [draft, setDraft] = useState<LatLng[] | null>(null);
  const shownRoute = draft ?? savedRoute;

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
  // after that only the Recenter button moves the camera.
  const pointsCenter = useMemo(
    () => centerOf([...savedRoute, ...presence.rows.map((r) => ({ latitude: r.lat, longitude: r.lng }))]),
    [savedRoute, presence.rows],
  );
  const center = pointsCenter ?? myPosition;
  const centeredOn = useRef<'none' | 'mine' | 'points'>('none');
  useEffect(() => {
    if (centeredOn.current === 'points' || !center) return;
    if (!pointsCenter && centeredOn.current === 'mine') return;
    centeredOn.current = pointsCenter ? 'points' : 'mine';
    mapRef.current?.setCameraPosition({ coordinates: center, zoom: 15 });
  }, [center, pointsCenter]);

  function recenter() {
    if (center) mapRef.current?.setCameraPosition({ coordinates: center, zoom: 15 });
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      Alert.alert(errorMessage(e));
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
      run('allowed', () => setLocationAllowed(room.id, true));
      return;
    }
    Alert.alert(en.map.endConfirmTitle, en.map.allowLocationHint, [
      { text: en.map.cancel, style: 'cancel' },
      { text: en.map.endActivity, style: 'destructive', onPress: () => run('allowed', () => setLocationAllowed(room.id, false)) },
    ]);
  }

  function toggleActivity() {
    if (!active) {
      run('activity', () => setActivityState(room.id, 'active'));
      return;
    }
    Alert.alert(en.map.endConfirmTitle, en.map.endConfirmBody, [
      { text: en.map.cancel, style: 'cancel' },
      { text: en.map.endActivity, style: 'destructive', onPress: () => run('activity', () => setActivityState(room.id, 'ended')) },
    ]);
  }

  function onMapClick(event: { coordinates: { latitude?: number; longitude?: number } }) {
    const { latitude, longitude } = event.coordinates;
    if (latitude == null || longitude == null) return;
    setDraft((d) => (d && d.length < MAX_ROUTE_POINTS ? [...d, { latitude, longitude }] : d));
  }

  function saveDraft() {
    if (!draft) return;
    run('route', async () => {
      await saveRoute(room.id, draft);
      setDraft(null);
    });
  }

  // M1: a fresh member with a profile photo is an annotation with the photo as its icon (square: expo-maps
  // draws the icon as a plain 50 pt image and cannot round it). No photo, still loading or a failed load:
  // an initials marker. Stale: a grey clock marker with no speed (C4), photo or not. Only current members
  // (`avatars` comes from listMembers) get a photo; the title (name · speed) is the selection callout for both.
  const pinInputs: PinInput[] = presence.rows.map((row) => ({
    userId: row.user_id,
    coordinates: { latitude: row.lat, longitude: row.lng },
    updatedAt: row.updated_at,
    speedMps: row.speed_mps,
    label: displayName(row, userId, names),
    initialsOf: names.get(row.user_id) ?? '',
    avatarPath: avatars.get(row.user_id) ?? null,
  }));
  const icons = useMarkerIcons(wantedIconPaths(pinInputs, now), session?.access_token);
  const pins = planPins(pinInputs, now, icons);
  const markers = pins.flatMap((pin) =>
    pin.kind === 'photo'
      ? []
      : [
          {
            id: pin.id,
            coordinates: pin.coordinates,
            title: pin.title,
            ...(pin.kind === 'stale' ? { systemImage: 'clock', tintColor: STALE_TINT } : { monogram: pin.monogram }),
          },
        ],
  );
  const annotations = pins.flatMap((pin) =>
    pin.kind === 'photo' ? [{ id: pin.id, coordinates: pin.coordinates, title: pin.title, icon: pin.icon }] : [],
  );

  const reporterText = en.map.reporter[sharingState];
  const reporterIsError = sharingState === 'error' || sharingState === 'no-permission' || sharingState === 'refused';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: en.map.title }} />

      <View style={styles.mapWrap}>
        <AppleMaps.View
          ref={mapRef}
          style={styles.map}
          markers={markers}
          annotations={annotations}
          polylines={
            shownRoute.length > 1
              ? [{ id: 'route', coordinates: shownRoute, color: draft ? DRAFT_COLOR : ROUTE_COLOR, width: 4 }]
              : []
          }
          properties={{ isMyLocationEnabled: my.share && granted === true }}
          onMapClick={draft ? onMapClick : undefined}
        />
        {center ? (
          <Pressable accessibilityRole="button" onPress={recenter} style={styles.recenter}>
            <Text style={styles.link}>{en.map.recenter}</Text>
          </Pressable>
        ) : null}
      </View>

      {isHost ? (
        <View style={styles.group}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{en.map.allowLocation}</Text>
            <Switch
              value={allowed}
              disabled={busy === 'allowed'}
              onValueChange={toggleAllowed}
              accessibilityLabel={en.map.allowLocation}
            />
          </View>
          <Hint>{en.map.allowLocationHint}</Hint>
          {allowed ? (
            <Button
              title={active ? en.map.endActivity : en.map.startActivity}
              variant={active ? 'secondary' : 'primary'}
              busy={busy === 'activity'}
              onPress={toggleActivity}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={styles.status} accessibilityRole="header">
          {active ? en.map.activityActive : en.map.activityIdle}
        </Text>
        {!allowed ? <Hint>{en.map.notAllowed}</Hint> : !active ? <Hint>{en.map.activityIdleHint}</Hint> : null}
        {allowed ? (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{en.map.shareMine}</Text>
              <Switch
                value={my.share}
                disabled={busy === 'share'}
                onValueChange={toggleShare}
                accessibilityLabel={en.map.shareMine}
              />
            </View>
            <Hint>{en.map.shareMineHint}</Hint>
            {permissionDenied ? (
              <>
                <Hint tone="error">{en.map.permissionDenied}</Hint>
                <Button title={en.map.openSettings} variant="secondary" onPress={() => Linking.openSettings()} />
              </>
            ) : reporterText ? (
              <Hint tone={reporterIsError ? 'error' : 'normal'}>{reporterText}</Hint>
            ) : null}
          </>
        ) : null}
      </View>

      {active ? (
        <View style={styles.group}>
          <Text style={styles.status}>{en.map.members}</Text>
          {presence.rows.length === 0 ? <Hint>{en.map.nobody}</Hint> : null}
          {presence.rows.map((row) => (
            <PresenceRow
              key={row.user_id}
              row={row}
              name={displayName(row, userId, names)}
              initialOf={names.get(row.user_id) ?? ''}
              avatarPath={avatars.get(row.user_id) ?? null}
              now={now}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={styles.status}>{en.map.route}</Text>
        {isHost && draft ? (
          <>
            <Hint>{en.map.drawHint}</Hint>
            {draft.length >= MAX_ROUTE_POINTS ? <Hint tone="error">{en.map.routeTooLong(MAX_ROUTE_POINTS)}</Hint> : null}
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={() => setDraft((d) => (d ? d.slice(0, -1) : d))}>
                <Text style={styles.link}>{en.map.undo}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setDraft([])}>
                <Text style={styles.link}>{en.map.clear}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setDraft(null)}>
                <Text style={styles.link}>{en.map.cancel}</Text>
              </Pressable>
            </View>
            <Button title={en.map.save} busy={busy === 'route'} onPress={saveDraft} />
          </>
        ) : isHost ? (
          <Button title={en.map.drawRoute} variant="secondary" onPress={() => setDraft(savedRoute)} />
        ) : null}
      </View>
    </ScrollView>
  );
}

function displayName(row: Presence, userId: string | undefined, names: Map<string, string>) {
  return row.user_id === userId ? en.map.you : (names.get(row.user_id) ?? en.chat.formerMember);
}

/** C4: a stale row never shows its speed; it shows "Location stale" with its age instead. */
function PresenceRow({
  row,
  name,
  initialOf,
  avatarPath,
  now,
}: {
  row: Presence;
  name: string;
  initialOf: string;
  avatarPath: string | null;
  now: number;
}) {
  const age = formatAge(row.updated_at, now);
  const stale = isStale(row.updated_at, now);
  const speed = stale ? null : formatSpeedKmh(row.speed_mps);
  return (
    <View style={styles.presence}>
      <Avatar path={avatarPath} name={initialOf || name} size={28} />
      <View style={styles.presenceText}>
        <Text style={styles.presenceName}>{name}</Text>
        <Text style={[styles.presenceMeta, stale && styles.staleText]}>
          {stale ? en.map.stale(age) : [speed, en.map.updated(age)].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  loading: { marginTop: 48 },
  center: { padding: 20, gap: 12, alignItems: 'center' },
  goneTitle: { fontSize: 20, fontWeight: '600', color: colors.label },
  mapWrap: { height: 360, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' },
  map: { flex: 1 },
  recenter: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: colors.field,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 20 },
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
  link: { fontSize: 17, color: colors.tint },
  presence: {
    backgroundColor: colors.field,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presenceText: { flex: 1, gap: 2 },
  presenceName: { fontSize: 17, color: colors.label },
  presenceMeta: { fontSize: 14, color: colors.secondaryLabel, fontVariant: ['tabular-nums'] },
  staleText: { color: colors.warning },
});
