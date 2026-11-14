import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { Avatar } from '@/components/avatar';
import { EmergencyAlerts, useEmergencyPresence } from '@/components/room-activity';
import { RoomEnded } from '@/components/room-ended';
import { QREWING_FAB_CLEARANCE, QrewingFab } from '@/features/event/qrewing-fab';
import { Button, colors, Hint, Screen } from '@/components/ui';
import { EntryGate, HiddenRow, MuteBar, useQrewingChat } from '@/features/event/chat-layer';
import { DisclosureSheet } from '@/features/event/disclosure-sheet';
import { noteSiriRoomOpened } from '@/features/event/siri-mirror';
import { collapseSmallTalk, type MutedRow } from '@/features/event/event-plan';
import { useSmallTalk } from '@/features/event/use-small-talk';
import { useRecapTriggers } from '@/features/recap/use-recap-triggers';
import { ChatHeaderButtons, NoticesSheet, SettingsSheet, useChatNoticeProducers } from '@/features/chat/chat-header';
import { PinnedNotice } from '@/features/chat/pinned-notice';
import { PlusPanel, type PlusTile } from '@/features/chat/plus-panel';
import { cardsToAnswer } from '@/features/questions/question-plan';
import { useQuestionCards, useRoomCards } from '@/features/questions/question-store';
import { useRoomActivity } from '@/lib/activity';
import { clearRoomNotices, type Notice } from '@/lib/room-notices';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { type ChatItem, MAX_MESSAGE_LENGTH, useChat } from '@/lib/chat';
import { endsDay } from '@/lib/chat-plan';
import { canSendDraft, composerAutoFocus, composerReducer, initialComposer } from '@/lib/composer';
import { errorMessage } from '@/lib/errors';
import { presentServerReminder, syncExpiryReminders } from '@/lib/expiry-reminders';
import { clearRoomCache, useRoomUploadSummary } from '@/lib/media';
import { useRoomEvents } from '@/lib/room-channel';
import { showEndsSoon } from '@/lib/expiry-plan';
import { getRoom, listMembers, type Room } from '@/lib/rooms';
import { useHeaderOverlap } from '@/lib/use-header-overlap';
import { useKeyboardOpen } from '@/lib/use-keyboard-open';
import { memberName } from '@/lib/member-name';
import { useNow } from '@/lib/use-now';

type State =
  | { status: 'loading' }
  | { status: 'gone' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: Room; names: Map<string, string>; avatars: Map<string, string | null> };

export default function RoomScreen() {
  const { id, from, aiNote } = useLocalSearchParams<{ id: string; from?: string; aiNote?: string }>();
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
      // Spec 7.1: in the early-end grace window the room row is readable again but the room is closed; no
      // members list and no reminder, only the Room ended screen below.
      if (room.deleted_at !== null) {
        setState({ status: 'ready', room, names: new Map(), avatars: new Map() });
        return;
      }
      const members = await listMembers(id);
      setState({
        status: 'ready',
        room,
        names: new Map(members.map((m) => [m.user_id, m.display_name])),
        avatars: new Map(members.map((m) => [m.user_id, m.avatar_path])),
      });
      // Reschedules the local reminder when the host changed the expiry (rooms notice -> reload).
      syncExpiryReminders([room], false);
    } catch (e) {
      setState((s) => (s.status === 'ready' ? s : { status: 'error', message: errorMessage(e) }));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Room settings (expiry, activity_seq) and membership changes: reload the room and member names.
  // expiry_reminders: the server recorded the 24-hour reminder for this room (migration 0019).
  useRoomEvents(id, (event) => {
    if (event.table === 'rooms' || event.table === 'room_members') load();
    if (event.table === 'expiry_reminders' && state.status === 'ready') {
      presentServerReminder(state.room, event.expiry_version);
    }
  });

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
    if (!isGone) return;
    clearRoomCache(id);
    clearRoomNotices(id);
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
  // Q 06.04: the shared ended screen; the closed-at time only when this row shows it (expires_at passed).
  // Spec 7.3: a host-ended room (deleted_at; readable only in grace) shows Room ended, whose grace state offers
  // the recap, Photos of me and Photos & files.
  if (state.status === 'gone' || (state.status === 'ready' && (remainingMs <= 0 || state.room.deleted_at !== null))) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerTitle: '' }} />
        <RoomEnded room={state.status === 'ready' ? state.room : null} nowMs={now} reminder={from === 'reminder'} />
      </>
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
      avatars={state.avatars}
      userId={userId}
      remainingMs={remainingMs}
      onNewSender={onNewSender}
      onSendFailed={load}
      aiNote={aiNote === '1'}
    />
  );
}

function ChatRoom({
  room,
  names,
  avatars,
  userId,
  remainingMs,
  onNewSender,
  onSendFailed,
  aiNote,
}: {
  room: Room;
  names: Map<string, string>;
  avatars: Map<string, string | null>;
  userId: string | undefined;
  remainingMs: number;
  onNewSender: (senderId: string) => void;
  onSendFailed: () => void;
  /** Qrewing AI could not be turned on at create time (non-blocking note). */
  aiNote?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { rootRef, onLayout: measureRoot, top, overlap: headerOverlap } = useHeaderOverlap();
  const router = useRouter();
  const chat = useChat(room.id, userId, onNewSender);
  // Spec 10.5: the room I opened last is the one Siri asks about.
  useEffect(() => noteSiriRoomOpened(room.id), [room.id]);
  const uploadSummary = useRoomUploadSummary(room.id);
  // Spec 11: one activity read for the Emergency cards, the "+" panel (Arrived, Set status) and the bell.
  const activity = useRoomActivity(room.id, userId, room.activity_seq);
  const presence = useEmergencyPresence(room.id, activity);
  const [sheet, setSheet] = useState<'notices' | 'settings' | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [composer, dispatchComposer] = useReducer(composerReducer, initialComposer);
  // Qrewing AI (spec 3.2): disclosure, entry gate, Mute small talk with important-message alerts.
  const qrewing = useQrewingChat(room.id, room.type, userId);
  useRecapTriggers(room.id, userId, qrewing.aiEnabled, remainingMs);
  const [disclosureClosed, setDisclosureClosed] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const showDisclosure = (qrewing.gates.disclosure && !disclosureClosed) || askConsent;
  const isEvent = room.type === 'event';
  const smallTalk = useSmallTalk({
    roomId: room.id,
    userId,
    myName: userId ? names.get(userId) : undefined,
    muted: qrewing.available && isEvent && !!qrewing.me?.aiOk && !!qrewing.me?.mute,
    ready: !chat.loading,
    loadError: chat.error,
    messages: chat.messages,
  });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const rows: MutedRow<ChatItem>[] = useMemo(
    () =>
      smallTalk.active
        ? collapseSmallTalk(chat.messages, smallTalk.visible, expanded)
        : chat.messages.map((item) => ({ type: 'message' as const, item })),
    [smallTalk.active, smallTalk.visible, chat.messages, expanded],
  );
  const hiddenCount = rows.reduce((n, r) => n + (r.type === 'hidden' ? r.ids.length : 0), 0);
  const listRef = useRef<FlatList<MutedRow<ChatItem>>>(null);
  const [aiNoteShown, setAiNoteShown] = useState(!!aiNote);

  function showImportant(messageId: string) {
    let index = rows.findIndex((r) => (r.type === 'message' ? r.item.id === messageId : r.ids.includes(messageId)));
    if (index >= 0 && rows[index].type === 'hidden') {
      const key = (rows[index] as { key: string }).key;
      setExpanded((cur) => new Set(cur).add(key));
    }
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    smallTalk.dismissBanner();
  }
  const draft = composer.draft;
  const canSend = canSendDraft(draft);
  // Q 03.01 head (title, Ends line, tabs) and #9 ends-soon line hide while the keyboard is open, so typing
  // keeps the message space (work list: "Title must not cost message space with keyboard open").
  const keyboardOpen = useKeyboardOpen();
  const expiresMs = new Date(room.expires_at).getTime();
  const nowMs = expiresMs - remainingMs;
  const endsSoon = showEndsSoon(room.created_at, room.expires_at, nowMs);
  const endsLine = en.room.endsOn(
    endsDay(expiresMs, nowMs),
    new Date(expiresMs).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    new Date(expiresMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  );

  useChatNoticeProducers({ roomId: room.id, endsSoon, endsLine, activity, userId, names });
  // Spec 11 C: question cards (bell notices, read aloud while moving) and the "+" tile count.
  useQuestionCards(room, userId, names);
  const questionsWaiting = cardsToAnswer(useRoomCards(room.id).cards, userId).length;

  function submit() {
    if (!canSend) return;
    chat.send(draft);
    // Remount the input instead of clearing it in place (C-2, see lib/composer.ts).
    dispatchComposer({ type: 'sent' });
  }

  const failedCount = chat.messages.filter((m) => m.pending === 'failed').length;
  // A failed send may mean the room ended or the user was removed; re-check the room when a send fails.
  useEffect(() => {
    if (failedCount > 0) onSendFailed();
  }, [failedCount, onSendFailed]);

  // #8: a "shared 3 photos" line opens Photos.
  function openPhotos() {
    router.push({ pathname: '/room/[id]/gallery', params: { id: room.id } });
  }

  function onFailedPress(item: ChatItem) {
    Alert.alert(en.chat.failed, undefined, [
      { text: en.room.cancel, style: 'cancel' },
      { text: en.chat.discard, style: 'destructive', onPress: () => chat.discard(item.id) },
      { text: en.chat.retry, onPress: () => chat.retry(item.id) },
    ]);
  }

  const offline = !chat.live && !chat.loading ? <Text style={styles.offline}>{en.chat.reconnecting}</Text> : null;
  const showMute = qrewing.available && isEvent && !qrewing.gates.disclosure && !qrewing.gates.entry;
  const banner = smallTalk.banner;
  const bannerMessage = banner ? chat.messages.find((m) => m.id === banner.messageId) : undefined;

  function go(pathname: '/room/[id]/gallery' | '/room/[id]/map' | '/room/[id]/invite' | '/room/[id]/info') {
    setSheet(null);
    setPlusOpen(false);
    router.push({ pathname, params: { id: room.id } });
  }

  function openNotice(n: Notice) {
    setSheet(null);
    if (n.action?.kind === 'open-info') go('/room/[id]/info');
    else if (n.action?.kind === 'open-question') openQuestions(n.action.cardId);
    else if (n.action?.kind === 'open-ask') {
      setPlusOpen(false);
      router.push({ pathname: '/room/[id]/ask', params: { id: room.id } });
    }
    // open-chat (Emergency): the card is already on this screen, above the messages.
  }

  function openQuestions(cardId?: string) {
    setSheet(null);
    setPlusOpen(false);
    router.push({ pathname: '/room/[id]/questions', params: cardId ? { id: room.id, cardId } : { id: room.id } });
  }

  function togglePlus() {
    if (!plusOpen) Keyboard.dismiss();
    setPlusOpen(!plusOpen);
  }

  const plusTiles: PlusTile[] = [
    {
      key: 'photos',
      symbol: 'photo.on.rectangle',
      label: en.media.headerLink,
      detail:
        uploadSummary.failed > 0
          ? en.media.headerLinkFailed
          : uploadSummary.pending > 0
            ? en.media.headerLinkUploading(uploadSummary.pending)
            : undefined,
      danger: uploadSummary.failed > 0,
      onPress: () => go('/room/[id]/gallery'),
    },
    ...(room.location_allowed || room.host_id === userId
      ? [{ key: 'map', symbol: 'map', label: en.map.headerLink, onPress: () => go('/room/[id]/map') } satisfies PlusTile]
      : []),
    ...(qrewing.available || questionsWaiting > 0
      ? [
          {
            key: 'questions',
            symbol: 'questionmark.bubble',
            label: en.questions.tile,
            badge: questionsWaiting,
            onPress: () => openQuestions(),
          } satisfies PlusTile,
        ]
      : []),
  ];

  return (
    <>
      {/* Spec 11 A8: no "Chat" title; the room name is the header title. A9/A12: bell and gear on the right. */}
      <Stack.Screen
        options={{
          title: room.name,
          headerTitle: () => (
            <HandTitle style={styles.headerTitle} numberOfLines={1}>
              {room.name}
            </HandTitle>
          ),
          headerRight: () => (
            <ChatHeaderButtons roomId={room.id} onBell={() => setSheet('notices')} onGear={() => setSheet('settings')} />
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={top}>
        <View
          ref={rootRef}
          onLayout={measureRoot}
          style={[styles.flex, { backgroundColor: colors.background, paddingTop: headerOverlap }]}
        >
          {offline ? <View style={styles.compactStrip}>{offline}</View> : null}
          {aiNoteShown && !keyboardOpen ? (
            <Pressable style={styles.aiNote} onPress={() => setAiNoteShown(false)} accessibilityRole="button">
              <Hint>{en.qrewing.create.aiSaveFailed}</Hint>
            </Pressable>
          ) : null}
          {banner && bannerMessage ? (
            <PinnedNotice
              heading={banner.mention ? en.qrewing.mute.mentioned : en.qrewing.mute.banner(banner.reason ?? '')}
              body={bannerMessage.body ?? ''}
              onOpen={() => showImportant(banner.messageId)}
              onDismiss={smallTalk.dismissBanner}
            />
          ) : null}
          {/* Emergency cards stay above the messages; Arrived and Set status moved into "+" (A11). */}
          <View style={styles.alerts}>
            <EmergencyAlerts roomId={room.id} activity={activity} userId={userId} names={names} presence={presence} />
          </View>

          {/* Spec 10.1: the list area ends at the composer, so Ask Qrewing floats over the list and never covers it. */}
          <View style={styles.flex}>
          {qrewing.gates.entry ? (
            <EntryGate roomId={room.id} />
          ) : chat.loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : chat.error && chat.messages.length === 0 ? (
            <View style={styles.center}>
              <Hint tone="error">{en.chat.loadError}</Hint>
              <Button title={en.home.retry} variant="secondary" onPress={chat.reload} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.flex}
              inverted
              data={rows}
              keyExtractor={(r) => (r.type === 'hidden' ? r.key : r.item.id)}
              onScrollToIndexFailed={({ averageItemLength, index }) =>
                listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true })
              }
              // Inverted: paddingTop is the visual bottom, so the newest message clears Ask Qrewing.
              contentContainerStyle={[styles.list, { paddingTop: QREWING_FAB_CLEARANCE }]}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onEndReached={chat.hasMore ? chat.loadOlder : undefined}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Hint>{en.chat.empty}</Hint>
                </View>
              }
              renderItem={({ item: row }) => {
                if (row.type === 'hidden') {
                  return (
                    <HiddenRow
                      count={row.ids.length}
                      onPress={() => setExpanded((cur) => new Set(cur).add(row.key))}
                    />
                  );
                }
                const item = row.item;
                return (
                  <MessageRow
                    item={item}
                    mine={item.sender_id === userId}
                    name={item.sender_id ? memberName(names, item.sender_id, room.host_id, en.chat) : ''}
                    avatarPath={item.sender_id ? avatars.get(item.sender_id) : null}
                    isHost={!!item.sender_id && item.sender_id === room.host_id}
                    onFailedPress={onFailedPress}
                    onMediaPress={openPhotos}
                  />
                );
              }}
            />
          )}
          <QrewingFab roomId={room.id} />
          </View>

          {/* A10: before entry info there is no composer and no "+" (the tabs and status pills are gone with it). */}
          {qrewing.gates.entry ? null : (
            <View style={[styles.composer, { paddingBottom: plusOpen ? 8 : Math.max(insets.bottom, 8) }]}>
              {/* Spec 11 A11: "+" left of the field (KakaoTalk); it turns into a cross while the grid is open. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={plusOpen ? en.chat.moreClose : en.chat.more}
                accessibilityState={{ expanded: plusOpen }}
                onPress={togglePlus}
                hitSlop={6}
                style={({ pressed }) => [styles.plusButton, pressed && { opacity: 0.5 }]}
              >
                <SymbolView name={plusOpen ? 'xmark' : 'plus'} size={20} tintColor={colors.label} />
              </Pressable>
              <View style={styles.inputWrap}>
                <TextInput
                  key={composer.key}
                  autoFocus={composerAutoFocus(composer)}
                  style={styles.input}
                  value={draft}
                  onChange={(e) => dispatchComposer({ type: 'change', key: composer.key, text: e.nativeEvent.text })}
                  onFocus={() => setPlusOpen(false)}
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
                  hitSlop={6}
                  style={({ pressed }) => [styles.sendButton, (!canSend || pressed) && { opacity: 0.3 }]}
                >
                  <SymbolView name="arrow.right" size={20} tintColor={colors.label} />
                </Pressable>
              </View>
            </View>
          )}
          {plusOpen && userId && !qrewing.gates.entry ? (
            <PlusPanel
              activity={activity}
              userId={userId}
              tiles={plusTiles}
              onDone={() => setPlusOpen(false)}
              bottomInset={insets.bottom}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <NoticesSheet
        roomId={room.id}
        visible={sheet === 'notices'}
        endsLine={endsLine}
        onClose={() => setSheet(null)}
        onOpen={openNotice}
      />
      <SettingsSheet
        visible={sheet === 'settings'}
        onClose={() => setSheet(null)}
        onInvite={() => go('/room/[id]/invite')}
        onInfo={() => go('/room/[id]/info')}
      >
        {showMute ? (
          <MuteBar
            roomId={room.id}
            me={qrewing.me}
            hiddenCount={hiddenCount}
            unavailable={smallTalk.unavailable !== null}
            onChanged={qrewing.reload}
            onNeedConsent={() => {
              setSheet(null);
              // iOS presents one modal at a time: the consent sheet opens once the settings sheet has slid away.
              setTimeout(() => setAskConsent(true), 400);
            }}
          />
        ) : null}
      </SettingsSheet>
      <DisclosureSheet
        roomId={room.id}
        visible={showDisclosure}
        onDone={() => {
          setAskConsent(false);
          qrewing.reload();
        }}
        onClose={() => {
          setAskConsent(false);
          setDisclosureClosed(true);
        }}
      />
    </>
  );
}

// Centered lines rather than bubbles. #8: 'media' is the uploader's "shared 3 photos" line.
const NOTICE_KINDS = new Set(['system', 'arrival', 'status', 'emergency', 'media']);

function MessageRow({
  item,
  mine,
  name,
  avatarPath,
  isHost,
  onFailedPress,
  onMediaPress,
}: {
  item: ChatItem;
  mine: boolean;
  name: string;
  avatarPath: string | null | undefined;
  isHost: boolean;
  onFailedPress: (item: ChatItem) => void;
  onMediaPress: () => void;
}) {
  const time = useMemo(
    () => new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [item.created_at],
  );

  if (item.kind === 'media') {
    const text = en.chat.shared(mine ? en.chat.you : name, item.body || en.chat.sharedFallback);
    return (
      <Pressable
        style={styles.noticeRow}
        accessibilityRole="button"
        accessibilityHint={en.chat.openPhotosHint}
        onPress={onMediaPress}
      >
        <Text style={[styles.notice, styles.mediaNotice]}>
          {text} · {time}
        </Text>
      </Pressable>
    );
  }

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

  // Q 03.01: "Jay · 8:48 AM" / "You · 8:53 AM" above each bubble; sending and failed states replace the time.
  const failed = item.pending === 'failed';
  const when = item.pending === 'sending' ? en.chat.sending : failed ? en.chat.failed : time;
  const bubble = (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, failed && styles.failedBubble]}>
      <Text selectable style={styles.body}>
        {item.body}
      </Text>
    </View>
  );

  if (mine) {
    return (
      <View style={[styles.row, styles.rowMine]}>
        <Text style={[styles.meta, failed && styles.failedMeta]}>
          {en.chat.you} · {when}
        </Text>
        {failed ? (
          <Pressable accessibilityRole="button" accessibilityHint={en.chat.failed} onPress={() => onFailedPress(item)}>
            {bubble}
          </Pressable>
        ) : (
          bubble
        )}
      </View>
    );
  }

  // Spec 11 A14: others get avatar + name + bubble; the host's avatar has an ink ring and a "Host" tag.
  return (
    <View style={styles.theirRow}>
      <View style={[styles.avatarRing, isHost && styles.avatarRingHost]}>
        <Avatar path={avatarPath} name={name} size={34} />
      </View>
      <View style={[styles.row, styles.rowTheirs]}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, isHost && styles.nameHost]} numberOfLines={1}>
            {name}
          </Text>
          {isHost ? (
            <View style={styles.hostTag}>
              <Text style={styles.hostTagText} maxFontSizeMultiplier={1.4}>
                {en.chat.hostTag}
              </Text>
            </View>
          ) : null}
          <Text style={styles.meta}>{when}</Text>
        </View>
        {bubble}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 48 },
  center: { padding: 20, gap: 12 },
  // The nav bar title: smaller than a screen title so a long room name fits beside back, bell and gear.
  headerTitle: { fontSize: 24, lineHeight: 30, maxWidth: 210 },
  alerts: { paddingHorizontal: 24 },
  aiNote: { paddingHorizontal: 24, paddingBottom: 6 },
  compactStrip: { paddingHorizontal: 24, paddingVertical: 6, alignItems: 'flex-end' },
  offline: { fontSize: 13, color: colors.warning },
  list: { paddingHorizontal: 24, paddingVertical: 8, gap: 2, flexGrow: 1 },
  // The list is inverted, so the empty state is flipped back.
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scaleY: -1 }] },
  row: { marginVertical: 6, maxWidth: '80%', gap: 4 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start', marginVertical: 0, maxWidth: '100%', flexShrink: 1 },
  theirRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 6, maxWidth: '86%' },
  avatarRing: { padding: 2, borderRadius: 21, borderWidth: 1.5, borderColor: 'transparent' },
  avatarRingHost: { borderColor: colors.label },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 13, color: colors.label },
  nameHost: { fontWeight: '700' },
  hostTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderCurve: 'continuous',
    backgroundColor: colors.tint,
  },
  hostTagText: { fontSize: 11, fontWeight: '600', color: colors.onTint },
  bubble: { borderRadius: 10, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 9 },
  mine: { backgroundColor: colors.fieldStrong },
  theirs: { backgroundColor: colors.field },
  failedBubble: { opacity: 0.6 },
  body: { fontSize: 16, color: colors.label },
  meta: { fontSize: 12, color: colors.secondaryLabel },
  failedMeta: { color: colors.danger },
  noticeRow: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 16 },
  notice: { fontSize: 13, color: colors.secondaryLabel, textAlign: 'center' },
  // Spec 11 A17: Emergency reads in black (weight, not red), as on the card.
  emergency: { color: colors.label, fontWeight: '700' },
  mediaNotice: { color: colors.label, textDecorationLine: 'underline' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 24,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  plusButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.separator,
    borderRadius: 22,
    borderCurve: 'continuous',
    paddingLeft: 16,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    color: colors.label,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
  },
  sendButton: { width: 36, height: 42, alignItems: 'center', justifyContent: 'center' },
});
