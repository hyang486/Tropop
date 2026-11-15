import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/text';

import { InkArt } from '@/components/ink-art';
import { QRowCard } from '@/components/q-row-card';
import { QLabel, QLink, QScreen } from '@/components/q-screen';
import { RoomEnded } from '@/components/room-ended';
import { Button, colors, Hint } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  enrollFace,
  type FaceEnrollment,
  faceRefUrl,
  loadFaceData,
  pickFaceReference,
  removeFaceEnrollment,
  runFaceMatch,
} from '@/lib/face';
import { matchedPhotoCount } from '@/lib/face-plan';
import { createLatestLoader } from '@/lib/latest-load';
import { useRoomEvents } from '@/lib/room-channel';
import { getRoom, type Room } from '@/lib/rooms';
import { useRoomOver } from '@/lib/use-room-over';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'gone' }
  | { status: 'ready'; room: Room; enrollment: FaceEnrollment | null; refUrl: string | null; matchCount: number };

/**
 * Photos of me setup for one room (Tropop unit 5, Q 06.02): review the reference with the full consent points,
 * or (once enrolled) the private reference with Manage (Replace, Stop and remove) at the top right. Nothing is
 * uploaded before "Agree and save".
 */
export default function FaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [replacing, setReplacing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [details, setDetails] = useState(false);
  // UX2-81: the reference photo failed to load; `refTry` remounts the Image for a fresh load.
  const [refFailed, setRefFailed] = useState(false);
  const [refTry, setRefTry] = useState(0);
  // UX2-17 (P): camera access is off; the camera-off screen's art and copy, with Open Settings.
  const [cameraOff, setCameraOff] = useState(false);
  // FG-L1: focus and pull loads can overlap; only the newest one is applied.
  const [runLatest] = useState(createLatestLoader);

  const load = useCallback(async () => {
    if (!userId) return;
    await runLatest(
      `${id}|${userId}`,
      async () => {
        // G-U6-1: the room row comes with the face data, so a room that ended or expired shows Room ended
        // instead of an enrollment form whose save would fail.
        const [room, { enrollment, matches }] = await Promise.all([getRoom(id), loadFaceData(id, userId)]);
        if (!room) return null;
        const refUrl = enrollment ? await faceRefUrl(enrollment.ref_path) : null;
        return { room, enrollment, refUrl, matchCount: matchedPhotoCount(matches) };
      },
      (outcome) => {
        if (outcome.ok) {
          setState(outcome.data ? { status: 'ready', ...outcome.data } : { status: 'gone' });
          return;
        }
        // A failed refresh keeps the screen that is already shown and says why.
        const text = errorMessage(outcome.error);
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', message: text }));
        setMessage(text);
      },
    );
  }, [id, userId, runLatest]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pullRefresh = useCallback(async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);
  // G-U6-1, as Chat: a host's End or a removal arrives as a rooms / room_members notice.
  useRoomEvents(id, (event) => {
    if (event.table === 'rooms' || event.table === 'room_members') load();
  });
  const ended = useRoomOver(state.status === 'ready' ? state.room : null);

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={pullRefresh} enabled={!busy} />;

  async function pick(source: 'camera' | 'library') {
    setMessage(null);
    try {
      const uri = await pickFaceReference(source);
      if (uri) setPicked(uri);
    } catch (e) {
      const text = errorMessage(e);
      if (source === 'camera' && text === en.face.cameraDenied) {
        setCameraOff(true);
        return;
      }
      setMessage(source === 'library' ? text : en.face.cameraUnavailable);
    }
  }

  // UX2-17: back from Settings, try the camera again; still off shows this screen again.
  useEffect(() => {
    if (!cameraOff) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setCameraOff(false);
      pick('camera');
    });
    return () => sub.remove();
  }, [cameraOff]);

  async function save() {
    if (!picked) {
      setMessage(en.face.chooseFirst);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await enrollFace(id, picked);
      if ('error' in result) {
        setMessage(result.error);
        return;
      }
      // FG-2: one run right after enrolling; the gallery shows its result (disabled while the switch is off).
      await runFaceMatch(id);
      router.back();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function confirmStop() {
    Alert.alert(en.face.stopTitle, en.face.stopBody, [
      { text: en.face.cancel, style: 'cancel' },
      {
        text: en.face.stopConfirm,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const result = await removeFaceEnrollment(id);
          setBusy(false);
          if ('error' in result) {
            setMessage(result.error ?? null);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  function openPicker() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [en.face.takePhoto, en.face.choosePhoto, en.face.cancel], cancelButtonIndex: 2 },
      (index) => {
        if (index === 0) pick('camera');
        if (index === 1) pick('library');
      },
    );
  }

  // Q 06.02 / work list B: Replace and Stop and remove live under Manage (top right); same actions as before.
  function openManage() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [en.face.replace, en.face.stop, en.face.cancel], cancelButtonIndex: 2, destructiveButtonIndex: 1 },
      (index) => {
        if (index === 0) {
          setPicked(null);
          setMessage(null);
          setReplacing(true);
        }
        if (index === 1) confirmStop();
      },
    );
  }

  if (state.status === 'loading') {
    return (
      <QScreen>
        <Stack.Screen options={{ headerTitle: '' }} />
        <ActivityIndicator style={styles.loading} />
      </QScreen>
    );
  }
  if (state.status === 'gone' || ended.over) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: '', headerRight: () => null }} />
        <RoomEnded room={state.status === 'ready' ? state.room : null} nowMs={ended.nowMs} />
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <QScreen title={en.face.title} actions={<Button title={en.home.retry} variant="secondary" busy={refreshing} onPress={pullRefresh} />}>
        <Stack.Screen options={{ headerTitle: '' }} />
        <Hint tone="error">{state.message}</Hint>
      </QScreen>
    );
  }

  if (state.enrollment && !replacing) {
    return (
      <QScreen title={en.face.title} subtitle={en.face.referenceHint} refreshControl={refreshControl}>
        <Stack.Screen
          options={{
            headerTitle: '',
            headerRight: () => (
              <Pressable onPress={openManage} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} hitSlop={8}>
                <Text style={[styles.headerLink, busy && styles.dimmed]}>{en.face.manage}</Text>
              </Pressable>
            ),
          }}
        />
        <QLabel>{en.face.referenceTitle}</QLabel>
        <View style={styles.photoBox}>
          {state.refUrl && refFailed ? (
            <SymbolView name="person" size={32} tintColor={colors.ink2} />
          ) : state.refUrl ? (
            <Image
              key={refTry}
              source={{ uri: state.refUrl }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel={en.face.referenceTitle}
              onError={() => setRefFailed(true)}
            />
          ) : (
            <SymbolView name="faceid" size={56} tintColor={colors.secondaryLabel} />
          )}
        </View>
        {state.refUrl && refFailed ? (
          <View style={styles.refFailed}>
            <Text style={styles.refFailedText}>{en.face.referenceFailed}</Text>
            <Pressable
              onPress={() => {
                setRefFailed(false);
                setRefTry((n) => n + 1);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.refRetry, pressed && styles.dimmed]}
            >
              <Text style={styles.headerLink}>{en.face.tryAgain}</Text>
            </Pressable>
          </View>
        ) : null}
        {/* UX2-68: the way from the reference to the matches; Photos & files opens on the Of me filter. */}
        {state.matchCount > 0 ? (
          <QRowCard
            icon="face.smiling"
            title={en.face.matchCount(state.matchCount)}
            onPress={() => router.push({ pathname: '/room/[id]/gallery', params: { id, filter: 'me' } })}
          />
        ) : (
          <QRowCard icon="face.smiling" title={en.face.noMatchesYet} />
        )}
        {busy ? <ActivityIndicator /> : null}
        {message ? <Hint tone="error">{message}</Hint> : null}
      </QScreen>
    );
  }

  if (cameraOff) {
    return (
      <QScreen
        title={en.cameraOff.title}
        subtitle={en.cameraOff.body}
        bottomAlign="center"
        bottom={<InkArt art="camera" width={220} />}
        actions={
          <>
            <Button title={en.cameraOff.openSettings} onPress={() => Linking.openSettings()} />
            <Button
              title={en.cameraOff.chooseLibrary}
              variant="secondary"
              onPress={() => {
                setCameraOff(false);
                pick('library');
              }}
            />
            <QLink title={en.face.cancel} onPress={() => setCameraOff(false)} />
          </>
        }
      >
        <Stack.Screen options={{ headerTitle: '', headerRight: () => null }} />
      </QScreen>
    );
  }

  // Q 06.02: review before saving. UX P2-2: two short lines; all five consent points (incl. Rekognition) open
  // under "Details ›" above the pinned "Agree and save"; nothing is uploaded before Agree.
  return (
    <QScreen
      title={picked ? en.face.reviewTitle : en.face.addTitle}
      subtitle={en.face.reviewSubtitle}
      refreshControl={refreshControl}
      actions={
        <>
          {/* UX2-69: one filled "Choose a photo" until a photo is chosen; then Agree and save + Choose another. */}
          {picked ? (
            <>
              <Button title={en.face.agree} busy={busy} onPress={save} />
              <Button title={en.face.chooseAnother} variant="secondary" disabled={busy} onPress={openPicker} />
            </>
          ) : (
            <Button title={en.face.pickPhoto} disabled={busy} onPress={openPicker} />
          )}
          {replacing ? <QLink title={en.face.cancel} onPress={() => setReplacing(false)} /> : null}
        </>
      }
    >
      <Stack.Screen options={{ headerTitle: '', headerRight: () => null }} />
      <Pressable
        onPress={openPicker}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={picked ? en.face.chooseAnother : en.face.pickPhoto}
        accessibilityHint={en.face.pickPhotoHint}
        style={styles.photoBox}
      >
        {picked ? (
          <Image source={{ uri: picked }} style={styles.photo} contentFit="cover" />
        ) : (
          <SymbolView name="faceid" size={56} tintColor={colors.secondaryLabel} accessibilityLabel={en.face.noPhotoYet} />
        )}
      </Pressable>
      {message ? <Hint tone="error">{message}</Hint> : null}
      {busy ? <Hint>{en.face.saving}</Hint> : null}
      <Text style={styles.consentTitle} accessibilityRole="header">
        {en.face.consentTitle}
      </Text>
      <View style={styles.points}>
        {en.face.consentShort.map((p) => (
          <Text key={p} style={styles.point}>
            {p}
          </Text>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails((d) => !d)}
          hitSlop={8}
          style={styles.detailsLink}
        >
          <Text style={styles.detailsText}>{details ? en.face.hideDetails : en.face.details}</Text>
        </Pressable>
        {details
          ? en.face.consentPoints.map((p) => (
              <Text key={p} style={styles.point}>
                • {p}
              </Text>
            ))
          : null}
      </View>
    </QScreen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
  headerLink: { fontSize: 17, color: colors.tint },
  dimmed: { opacity: 0.4 },
  photoBox: {
    height: 260,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  refFailed: { alignItems: 'center' },
  refFailedText: { fontSize: 15, color: colors.ink2, textAlign: 'center' },
  refRetry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  consentTitle: { fontSize: 17, fontWeight: '600', color: colors.label, marginTop: 4 },
  points: { gap: 8 },
  point: { fontSize: 15, lineHeight: 21, color: colors.label },
  detailsLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  detailsText: { fontSize: 15, fontWeight: '600', color: colors.tint },
});
