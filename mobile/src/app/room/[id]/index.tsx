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
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { Avatar } from '@/components/avatar';
import { Composer } from '@/components/composer';
import { EmptyState } from '@/components/empty-state';
import { EmergencyAlerts, useEmergencyPresence } from '@/components/room-activity';
import { RoomEnded } from '@/components/room-ended';
import { QREWING_FAB_CLEARANCE, QrewingFab, useQrewingAskButton } from '@/features/event/qrewing-fab';
import { Button, colors, Hint, Screen, size } from '@/components/ui';
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
import { chatLine } from '@/lib/chat-line';
import { useRoomActivity } from '@/lib/activity';
import { clearRoomNotices, type Notice } from '@/lib/room-notices';
import { usePlanState } from '@/features/calendar/calendar-store';
import { plusIntroHref } from '@/features/calendar/plus-intro';
import { AnswerSheet } from '@/features/questions/answer-sheet';
import { en } from '@/i18n/en';
import { useAuth } from '@/lib/auth';
import { type ChatItem, MAX_MESSAGE_LENGTH, useChat } from '@/lib/chat';
import { endsDay } from '@/lib/chat-plan';
import { canSendDraft, composerAutoFocus, composerReducer, initialComposer } from '@/lib/composer';
import { errorMessage } from '@/lib/errors';
import { disclosureHeld } from '@/lib/emergency-plan';
import { presentServerReminder, syncExpiryReminders } from '@/lib/expiry-reminders';
import { ReminderCard, useReminderCard } from '@/features/event/reminder-card';
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
      // UX2-130: never prompts here; the in-chat reminder card is the only place that asks.
      syncExpiryReminders([room], false, { ask: false });
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
  // UX2-130: the reminder card, once per room, above the newest message (it scrolls with the list).
  const reminderCard = useReminderCard(room, remainingMs, activity.emergencies.length > 0);
  const [sheet, setSheet] = useState<'notices' | 'settings' | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [composer, dispatchComposer] = useReducer(composerReducer, initialComposer);
  // Qrewing AI (spec 3.2): disclosure, entry gate, Mute small talk with important-message alerts.
  const qrewing = useQrewingChat(room.id, room.type, userId);
  useRecapTriggers(room.id, userId, qrewing.aiEnabled, remainingMs);
  const [disclosureClosed, setDisclosureClosed] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  // UX2-04: one Ask probe for the FAB and the "answered your question" notice (Free → Plus intro, like the FAB).
  const ask = useQrewingAskButton(room.id);
  // UX2-04b: my stored plan; a Free asker's "answered your question" notice opens AnswerSheet with this card.
  // C14: the read-only Free answer sheet only on a confirmed Free plan.
  const plan = usePlanState(userId);
  const [answerCard, setAnswerCard] = useState<string | null>(null);
  // UX2-110: the automatic disclosure sheet never covers an open (or unknown) Emergency; a tap on Ask still opens it.
  const showDisclosure =
    (qrewing.gates.disclosure &&
      !disclosureClosed &&
      !disclosureHeld({
        loading: activity.loading,
        error: activity.error,
        count: activity.emergencies.length,
        stale: activity.stale,
        slow: activity.slow,
      })) ||
    askConsent;
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
    // UX2-41: while chat is offline a retry can't go through, so the alert says so and offers no Try again.
    const online = chat.live;
    Alert.alert(en.chat.failedTitle, online ? undefined : en.errors.offline, [
      { text: en.room.cancel, style: 'cancel' },
      { text: en.chat.discard, style: 'destructive', onPress: () => chat.discard(item.id) },
      ...(online ? [{ text: en.chat.retry, onPress: () => chat.retry(item.id) }] : []),
    ]);
  }

  // UX2-107: one message, not two; while the Emergency row says "You're offline…", no "Reconnecting…" strip.
  const offline = !chat.live && !chat.loading && !activity.stale ? <Text style={styles.offline}>{en.chat.reconnecting}</Text> : null;
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
      const cardId = n.action.cardId;
      // UX2-04b: a Free asker reads the answer in a read-only sheet (once the notices sheet has slid away).
      if (plan === 'free' && cardId) setTimeout(() => setAnswerCard(cardId), 400);
      // Before the probe answers, open the ask screen; its own plan_limit check shows the Plus state.
      else if (ask.available) ask.open();
      else router.push({ pathname: '/room/[id]/ask', params: { id: room.id } });
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
          ? en.media.headerLinkFailed(uploadSummary.failed)
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
          {/* UX P0-1: the pinned Emergency bar sits in the layout above the list, so the list starts below it. */}
          <View style={styles.alerts}>
            <EmergencyAlerts place="chat" roomId={room.id} activity={activity} userId={userId} names={names} presence={presence} />
          </View>

          {/* Spec 10.1: the list area ends at the composer, so Ask Qrewing floats over the list and never covers it.
              Clipped so a message scrolled past the top never shows behind the Emergency card above. */}
          <View style={[styles.flex, styles.clip]}>
          {chat.loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : chat.error && chat.messages.length === 0 ? (
            <EmptyState title={en.chat.loadError} action={{ title: en.home.retry, onPress: chat.reload }} />
          ) : (
            <FlatList
              ref={listRef}
              style={styles.flex}
              inverted
              data={rows}
              extraData={reminderCard.shown || reminderCard.busy}
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
                  <EmptyState art="gathering" artWidth={120} title={en.chat.emptyTitle} body={en.chat.empty} />
                </View>
              }
              renderItem={({ item: row, index }) => {
                // UX2-130: inside the newest row's cell, before it, so indices (scroll-to-message) don't shift.
                const card =
                  index === 0 && reminderCard.shown ? (
                    <ReminderCard busy={reminderCard.busy} onTurnOn={reminderCard.turnOn} onNotNow={reminderCard.notNow} />
                  ) : null;
                if (row.type === 'hidden') {
                  return (
                    <>
                      {card}
                      <HiddenRow
                        count={row.ids.length}
                        onPress={() => setExpanded((cur) => new Set(cur).add(row.key))}
                      />
                    </>
                  );
                }
                const item = row.item;
                return (
                  <>
                    {card}
                    <MessageRow
                      item={item}
                      mine={item.sender_id === userId}
                      name={item.sender_id ? memberName(names, item.sender_id, room.host_id, en.chat) : ''}
                      avatarPath={item.sender_id ? avatars.get(item.sender_id) : null}
                      isHost={!!item.sender_id && item.sender_id === room.host_id}
                      onFailedPress={onFailedPress}
                      onMediaPress={openPhotos}
                      onMapPress={room.location_allowed || room.host_id === userId ? () => go('/room/[id]/map') : undefined}
                    />
                  </>
                );
              }}
            />
          )}
          <QrewingFab ask={ask} />
          </View>

          {/* UX P1-1 / UX2-02 / UX2-74 (a): before entry info only Send is gated. The entry card takes the text field's place; the
              "+" and its panel (Emergency, Arrived, Photos, Map) stay, since Emergency must never sit behind a form. */}
          <View style={[styles.composer, { paddingBottom: plusOpen ? 8 : Math.max(insets.bottom, 8) }]}>
            {/* Spec 11 A11: "+" left of the field (KakaoTalk); it turns into a cross while the grid is open. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={plusOpen ? en.chat.moreClose : qrewing.gates.entry ? en.chat.moreGated : en.chat.more}
              accessibilityState={{ expanded: plusOpen }}
              onPress={togglePlus}
              hitSlop={6}
              style={({ pressed }) => [styles.plusButton, pressed && { opacity: 0.5 }]}
            >
              <SymbolView name={plusOpen ? 'xmark' : 'plus'} size={20} tintColor={colors.label} />
            </Pressable>
            {/* UX P1-11: the shared Composer (same field and ink up-arrow as Ask Qrewing). */}
            {qrewing.gates.entry ? (
              <EntryGate roomId={room.id} />
            ) : (
              <View style={styles.composerField}>
                <Composer
                  key={composer.key}
                  autoFocus={composerAutoFocus(composer)}
                  value={draft}
                  onChangeText={(text) => dispatchComposer({ type: 'change', key: composer.key, text })}
                  onFocus={() => setPlusOpen(false)}
                  onSend={submit}
                  placeholder={en.chat.placeholder}
                  sendLabel={en.chat.send}
                  canSend={canSend}
                  maxLength={MAX_MESSAGE_LENGTH}
                />
              </View>
            )}
          </View>
          {userId ? (
            <PlusPanel
              open={plusOpen}
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
      <AnswerSheet
        roomId={room.id}
        cardId={answerCard}
        answerer={(uid) => names.get(uid) ?? en.chat.formerMember}
        onClose={() => setAnswerCard(null)}
        onSeePlus={() => router.push(plusIntroHref('ask'))}
      />
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
  onMapPress,
}: {
  item: ChatItem;
  mine: boolean;
  name: string;
  avatarPath: string | null | undefined;
  isHost: boolean;
  onFailedPress: (item: ChatItem) => void;
  onMediaPress: () => void;
  /** Set when this person can open the Map, so "Activity started" links there. */
  onMapPress?: () => void;
}) {
  const time = useMemo(
    () => new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [item.created_at],
  );

  if (item.kind === 'media') {
    const text = en.chat.shared(mine ? en.chat.you : name, item.body || en.chat.sharedFallback);
    // UX2-56 follow-up: 2 centered lines like the notice rows; no-break spaces keep "· time ›" together on the
    // last line; the whole row is one tap target of at least 44 pt.
    const tail = `·\u00A0${time.replace(/\s/g, '\u00A0')}\u00A0›`;
    return (
      <Pressable
        style={[styles.noticeRow, styles.mediaRow]}
        accessibilityRole="button"
        accessibilityHint={en.chat.openPhotosHint}
        onPress={onMediaPress}
      >
        <Text style={styles.notice} numberOfLines={2}>
          {text} {tail}
        </Text>
      </Pressable>
    );
  }

  if (NOTICE_KINDS.has(item.kind)) {
    // UX P1-2: grey, no red or bold (the pinned bar carries the Emergency itself). UX2-56: up to 2 centered lines so the time is kept.
    const line = chatLine(item.kind, item.body ?? '');
    if (line.kind === 'activityStarted' && onMapPress) {
      return (
        <Pressable style={styles.noticeRow} accessibilityRole="button" accessibilityHint={en.chat.openMapHint} onPress={onMapPress}>
          <Text style={styles.notice} numberOfLines={2}>
            {en.chat.activityStarted} · {en.chat.openMapLink} ›
          </Text>
        </Pressable>
      );
    }
    const text =
      line.kind === 'emergency' ? en.chat.emergencySet(line.name) : line.kind === 'activityStarted' ? en.chat.activityStarted : line.text;
    return (
      <View style={styles.noticeRow}>
        <Text style={styles.notice} numberOfLines={2}>
          {text} · {time}
        </Text>
      </View>
    );
  }

  // UX P1-3: others show "Jay · 8:48 AM" above the bubble; your own time sits under it. Sending and failed replace the time.
  const failed = item.pending === 'failed';
  const when = item.pending === 'sending' ? en.chat.sending : failed ? en.chat.failed : time;
  const bubble = (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, failed && styles.failedBubble]}>
      <Text selectable style={[styles.body, mine && styles.bodyMine]}>
        {item.body}
      </Text>
    </View>
  );

  if (mine) {
    return (
      <View style={[styles.row, styles.rowMine]}>
        {failed ? (
          <Pressable accessibilityRole="button" accessibilityHint={en.chat.failed} onPress={() => onFailedPress(item)}>
            {bubble}
          </Pressable>
        ) : (
          bubble
        )}
        <Text style={[styles.meta, failed && styles.failedMeta]} accessibilityLabel={`${en.chat.you}, ${when}`}>
          {when}
        </Text>
      </View>
    );
  }

  // Spec 11 A14: others get avatar + name + bubble; the host's avatar has an ink ring and a "Host" tag.
  return (
    <View style={styles.theirRow}>
      <View style={[styles.avatarRing, isHost && styles.avatarRingHost]}>
        <Avatar path={avatarPath} name={name} size={size.avatar} />
      </View>
      <View style={[styles.row, styles.rowTheirs]}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
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
  clip: { overflow: 'hidden' },
  loading: { marginTop: 48 },
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
  // UX P1-4: a 2 pt ink ring on the host's avatar (transparent for others, so rows line up).
  avatarRing: { borderRadius: size.avatar / 2 + 2, borderWidth: 2, borderColor: 'transparent' },
  avatarRingHost: { borderColor: colors.label },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.label },
  // UX P1-4: "Host" tag, 11 pt semibold, 1 pt ink outline, 4 pt radius.
  hostTag: { paddingHorizontal: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.label },
  hostTagText: { fontSize: 11, fontWeight: '600', color: colors.label },
  // UX P1-3: own bubbles are ink with paper text and a 4 pt tail corner; others keep the card color.
  bubble: { borderRadius: 18, borderCurve: 'continuous', paddingHorizontal: 13, paddingVertical: 9 },
  mine: { backgroundColor: colors.tint, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.field, borderTopLeftRadius: 4 },
  failedBubble: { opacity: 0.6 },
  body: { fontSize: 16, color: colors.label },
  bodyMine: { color: colors.onTint },
  meta: { fontSize: 12, color: colors.ink2 },
  failedMeta: { color: colors.errorText },
  noticeRow: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 16 },
  // UX2-56 follow-up: 44 pt tap target; less outer margin so the gap to its neighbours stays about the same.
  mediaRow: { minHeight: 44, justifyContent: 'center', marginVertical: 2 },
  notice: { fontSize: 13, color: colors.ink2, textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 24,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  plusButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  composerField: { flex: 1 },
});
