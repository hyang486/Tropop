import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, colors, Hint, Screen } from '@/components/ui';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { type ChatItem, MAX_MESSAGE_LENGTH, useChat } from '@/lib/chat';
import { errorMessage } from '@/lib/errors';
import { clearRoomCache } from '@/lib/media';
import { formatRemaining, getRoom, listMembers, REMINDER_WINDOW_MS, type Room } from '@/lib/rooms';
import { useNow } from '@/lib/use-now';

type State =
  | { status: 'loading' }
  | { status: 'gone' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: Room; names: Map<string, string> };

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const now = useNow(15_000);
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const room = await getRoom(id);
      if (!room) {
        setState({ status: 'gone' });
        return;
      }
      const members = await listMembers(id);
      setState({ status: 'ready', room, names: new Map(members.map((m) => [m.user_id, m.display_name])) });
    } catch (e) {
      setState((s) => (s.status === 'ready' ? s : { status: 'error', message: errorMessage(e) }));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // A new member's first message, or a join/leave notice: refresh names (and notice an ended room).
  const names = state.status === 'ready' ? state.names : undefined;
  const onNewSender = useCallback(
    (senderId: string) => {
      if (!senderId || !names?.has(senderId)) load();
    },
    [names, load],
  );

  // Ended, expired or left: drop this app's cached originals for the room.
  const isGone =
    state.status === 'gone' || (state.status === 'ready' && new Date(state.room.expires_at).getTime() <= now);
  useEffect(() => {
    if (isGone) clearRoomCache(id);
  }, [isGone, id]);

  if (state.status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator style={styles.loading} />
      </Screen>
    );
  }

  const remainingMs = state.status === 'ready' ? new Date(state.room.expires_at).getTime() - now : 0;

  // RLS hides the room once it expires, ends or the user leaves; the clock covers the gap until a reload.
  if (state.status === 'gone' || (state.status === 'ready' && remainingMs <= 0)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.gone}>
          <Text style={styles.goneTitle}>{en.room.gone}</Text>
          <Hint>{en.room.goneHint}</Hint>
        </View>
        <Button title={en.room.backToRooms} onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Hint tone="error">{state.message}</Hint>
        <Button title={en.home.retry} variant="secondary" onPress={load} />
      </Screen>
    );
  }

  return (
    <ChatRoom
      room={state.room}
      names={state.names}
      userId={userId}
      remainingMs={remainingMs}
      onNewSender={onNewSender}
      onSendFailed={load}
    />
  );
}

function ChatRoom({
  room,
  names,
  userId,
  remainingMs,
  onNewSender,
  onSendFailed,
}: {
  room: Room;
  names: Map<string, string>;
  userId: string | undefined;
  remainingMs: number;
  onNewSender: (senderId: string) => void;
  onSendFailed: () => void;
}) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  // Where this screen's root actually starts on screen. With a translucent (iOS 26) native header the
  // root starts at y = 0, behind the status bar and header; with an opaque one it starts below it.
  // Pad by the overlap only, and give the keyboard avoider the real offset, so both cases lay out right.
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [rootY, setRootY] = useState<number | null>(null);
  const measureRoot = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y) => setRootY(y));
  }, []);
  const top = rootY ?? headerHeight;
  const headerOverlap = Math.max(0, headerHeight - top);
  const chat = useChat(room.id, userId, onNewSender);
  const [draft, setDraft] = useState('');
  const remaining = formatRemaining(remainingMs);
  const canSend = draft.trim().length > 0;

  function submit() {
    if (!canSend) return;
    chat.send(draft);
    setDraft('');
  }

  const failedCount = chat.messages.filter((m) => m.pending === 'failed').length;
  // A failed send may mean the room ended or the user was removed; re-check the room when a send fails.
  useEffect(() => {
    if (failedCount > 0) onSendFailed();
  }, [failedCount, onSendFailed]);

  function onFailedPress(item: ChatItem) {
    Alert.alert(en.chat.failed, undefined, [
      { text: en.room.cancel, style: 'cancel' },
      { text: en.chat.discard, style: 'destructive', onPress: () => chat.discard(item.id) },
      { text: en.chat.retry, onPress: () => chat.retry(item.id) },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: room.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Link
                href={{ pathname: '/room/[id]/gallery', params: { id: room.id } }}
                style={styles.headerLink}
                accessibilityRole="button"
              >
                {en.media.headerLink}
              </Link>
              <Link
                href={{ pathname: '/room/[id]/invite', params: { id: room.id } }}
                style={styles.headerLink}
                accessibilityRole="button"
              >
                {en.room.invite}
              </Link>
              <Link
                href={{ pathname: '/room/[id]/info', params: { id: room.id } }}
                style={styles.headerLink}
                accessibilityRole="button"
              >
                {en.room.info}
              </Link>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={top}>
        <View
          ref={rootRef}
          onLayout={measureRoot}
          style={[styles.flex, { backgroundColor: colors.background, paddingTop: headerOverlap }]}
        >
          <View style={styles.strip}>
            <Text style={styles.remaining} accessibilityRole="header">
              {en.room.endsIn(remaining)}
            </Text>
            {!chat.live && !chat.loading ? <Text style={styles.offline}>{en.chat.reconnecting}</Text> : null}
          </View>
          {remainingMs < REMINDER_WINDOW_MS ? (
            <View style={styles.banner} accessibilityRole="alert">
              <Text style={styles.bannerTitle}>{en.room.reminderTitle}</Text>
              <Text style={styles.bannerBody}>{en.room.reminderBody(room.name, remaining)}</Text>
            </View>
          ) : null}

          {chat.loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : chat.error && chat.messages.length === 0 ? (
            <View style={styles.center}>
              <Hint tone="error">{en.chat.loadError}</Hint>
              <Button title={en.home.retry} variant="secondary" onPress={chat.reload} />
            </View>
          ) : (
            <FlatList
              style={styles.flex}
              inverted
              data={chat.messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.list}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onEndReached={chat.hasMore ? chat.loadOlder : undefined}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Hint>{en.chat.empty}</Hint>
                </View>
              }
              renderItem={({ item, index }) => (
                <MessageRow
                  item={item}
                  older={chat.messages[index + 1]}
                  mine={item.sender_id === userId}
                  name={item.sender_id ? (names.get(item.sender_id) ?? en.chat.formerMember) : ''}
                  onFailedPress={onFailedPress}
                />
              )}
            />
          )}

          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={en.chat.placeholder}
              placeholderTextColor={colors.secondaryLabel}
              accessibilityLabel={en.chat.placeholder}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en.chat.send}
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={submit}
              style={({ pressed }) => [styles.sendButton, (!canSend || pressed) && { opacity: 0.4 }]}
            >
              <Text style={styles.sendText}>{en.chat.send}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const NOTICE_KINDS = new Set(['system', 'arrival', 'status', 'emergency']);

function MessageRow({
  item,
  older,
  mine,
  name,
  onFailedPress,
}: {
  item: ChatItem;
  older: ChatItem | undefined;
  mine: boolean;
  name: string;
  onFailedPress: (item: ChatItem) => void;
}) {
  const time = useMemo(
    () => new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [item.created_at],
  );

  if (NOTICE_KINDS.has(item.kind)) {
    const emergency = item.kind === 'emergency';
    return (
      <View style={styles.noticeRow} accessibilityRole={emergency ? 'alert' : 'text'}>
        <Text style={[styles.notice, emergency && styles.emergency]}>
          {item.body} · {time}
        </Text>
      </View>
    );
  }

  // Media messages render in checkpoint 5; until then show a plain placeholder text.
  const body = item.kind === 'media' ? '📎' : item.body;
  const showName = !mine && (older?.sender_id !== item.sender_id || NOTICE_KINDS.has(older?.kind ?? ''));

  const bubble = (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, item.pending === 'failed' && styles.failedBubble]}>
      <Text selectable style={[styles.body, mine && styles.mineText]}>
        {body}
      </Text>
    </View>
  );

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      {showName ? <Text style={styles.sender}>{name}</Text> : null}
      {item.pending === 'failed' ? (
        <Pressable accessibilityRole="button" accessibilityHint={en.chat.failed} onPress={() => onFailedPress(item)}>
          {bubble}
        </Pressable>
      ) : (
        bubble
      )}
      <Text style={[styles.meta, item.pending === 'failed' && styles.failedMeta]}>
        {item.pending === 'sending' ? en.chat.sending : item.pending === 'failed' ? en.chat.failed : time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 48 },
  center: { padding: 20, gap: 12 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerLink: { fontSize: 17, color: colors.tint, paddingHorizontal: 6 },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  remaining: { fontSize: 15, fontWeight: '600', color: colors.label, fontVariant: ['tabular-nums'] },
  offline: { fontSize: 13, color: colors.warning },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.field,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    gap: 4,
  },
  bannerTitle: { fontSize: 15, fontWeight: '600', color: colors.label },
  bannerBody: { fontSize: 14, color: colors.label },
  list: { paddingHorizontal: 12, paddingVertical: 8, gap: 2, flexGrow: 1 },
  // The list is inverted, so the empty state is flipped back.
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scaleY: -1 }] },
  row: { marginVertical: 2, maxWidth: '80%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { fontSize: 12, color: colors.secondaryLabel, marginTop: 6, marginBottom: 2, marginLeft: 12 },
  bubble: { borderRadius: 18, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 8 },
  mine: { backgroundColor: colors.tint },
  theirs: { backgroundColor: colors.field },
  failedBubble: { opacity: 0.6 },
  body: { fontSize: 17, color: colors.label },
  mineText: { color: 'white' },
  meta: { fontSize: 11, color: colors.secondaryLabel, marginTop: 2, marginHorizontal: 8 },
  failedMeta: { color: colors.danger },
  noticeRow: { alignSelf: 'center', marginVertical: 6, paddingHorizontal: 16 },
  notice: { fontSize: 13, color: colors.secondaryLabel, textAlign: 'center' },
  emergency: { color: colors.danger, fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 36,
    backgroundColor: colors.field,
    color: colors.label,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 17,
  },
  sendButton: { height: 36, justifyContent: 'center', paddingHorizontal: 8 },
  sendText: { fontSize: 17, fontWeight: '600', color: colors.tint },
  gone: { paddingVertical: 48, alignItems: 'center', gap: 8 },
  goneTitle: { fontSize: 20, fontWeight: '600', color: colors.label },
});
