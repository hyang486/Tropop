import { type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { type SFSymbol, SymbolView } from 'expo-symbols';

import { colors, usePalette } from '@/components/ui';
import { en } from '@/i18n/en';
import type { RoomActivity } from '@/lib/activity';
import {
  markRoomNoticesRead,
  type Notice,
  removeNotice,
  roomNotices,
  upsertNotice,
  useRoomNotices,
} from '@/lib/room-notices';

import { ChatSheet, SheetRow } from './chat-sheet';

/** Spec 11 A8/A9/A12: the bell and the gear on the right of the chat header. */
export function ChatHeaderButtons({
  roomId,
  onBell,
  onGear,
  rt = false,
}: {
  roomId: string;
  onBell: () => void;
  onGear: () => void;
  /** F-RT2: inside our own Reduce Transparency capsule (44 pt items, no extra gap). */
  rt?: boolean;
}) {
  const { unread } = useRoomNotices(roomId);
  return (
    <View style={rt ? styles.rtRow : styles.headerRow}>
      <HeaderIcon symbol="bell" label={en.chat.noticesA11y(unread)} onPress={onBell} badge={unread} rt={rt} />
      <HeaderIcon symbol="gearshape" label={en.chat.settings} onPress={onGear} rt={rt} />
    </View>
  );
}

function HeaderIcon({
  symbol,
  label,
  onPress,
  badge = 0,
  rt = false,
}: {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
  badge?: number;
  rt?: boolean;
}) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={rt ? 0 : 7} style={rt ? styles.rtIcon : styles.icon}>
      <SymbolView name={symbol} size={22} tintColor={rt ? pal.ink : colors.tint} />
      {badge > 0 ? (
        <View style={styles.badge} importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const NOTICE_SYMBOL: Record<Notice['kind'], SFSymbol> = {
  'room-ending': 'hourglass',
  question: 'questionmark.bubble',
  emergency: 'exclamationmark.triangle',
  reminder: 'bell',
};

/**
 * Spec 11 A9: the bell's sheet. The room's end time is always the first line (it used to sit under the title);
 * below it the notices, newest first. Opening the sheet marks them read.
 */
export function NoticesSheet({
  roomId,
  visible,
  endsLine,
  onClose,
  onOpen,
}: {
  roomId: string;
  visible: boolean;
  endsLine: string;
  onClose: () => void;
  onOpen: (notice: Notice) => void;
}) {
  const { notices } = useRoomNotices(roomId);
  return (
    <ChatSheet visible={visible} title={en.chat.notices} onClose={onClose} onShow={() => markRoomNoticesRead(roomId)}>
      <Text style={styles.ends}>{endsLine}</Text>
      {notices.length === 0 ? <Text style={styles.empty}>{en.chat.noNotices}</Text> : null}
      {notices.map((n) => (
        <SheetRow
          key={n.id}
          symbol={NOTICE_SYMBOL[n.kind]}
          label={n.title}
          detail={n.body}
          lead={n.lead}
          a11yLabel={n.label}
          onPress={n.action ? () => onOpen(n) : undefined}
        />
      ))}
    </ChatSheet>
  );
}

/** Spec 11 A12: the gear's sheet. `children` holds room settings that live elsewhere (Mute small talk). */
export function SettingsSheet({
  visible,
  onClose,
  onInvite,
  onInfo,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onInvite: () => void;
  onInfo: () => void;
  children?: ReactNode;
}) {
  return (
    <ChatSheet visible={visible} title={en.chat.settings} onClose={onClose}>
      <SheetRow symbol="qrcode" label={en.room.invite} onPress={onInvite} />
      <SheetRow symbol="info.circle" label={en.room.info} onPress={onInfo} />
      {children ? <View style={styles.settingsExtra}>{children}</View> : null}
    </ChatSheet>
  );
}

/**
 * The chat screen's notice producers: "Room ends soon" while the ends-soon window is open, and one notice per
 * open Emergency from someone else. Each is removed when its cause goes away.
 */
export function useChatNoticeProducers({
  roomId,
  endsSoon,
  endsLine,
  activity,
  userId,
  names,
}: {
  roomId: string;
  endsSoon: boolean;
  endsLine: string;
  activity: RoomActivity;
  userId: string | undefined;
  names: ReadonlyMap<string, string>;
}) {
  useEffect(() => {
    const id = `room-ending:${roomId}`;
    if (!endsSoon) {
      removeNotice(id);
      return;
    }
    // createdAt is the moment the window opened on this phone; an identical re-upsert keeps the read state.
    const existing = roomNotices(roomId).notices.find((n) => n.id === id);
    upsertNotice({
      id,
      roomId,
      kind: 'room-ending',
      title: en.room.endsSoonLine,
      body: endsLine,
      createdAt: existing?.createdAt ?? Date.now(),
      action: { kind: 'open-info' },
    });
  }, [roomId, endsSoon, endsLine]);

  const emergencies = activity.loading ? null : activity.emergencies;
  useEffect(() => {
    if (!emergencies) return;
    const open = new Set<string>();
    for (const e of emergencies) {
      if (e.userId === userId) continue;
      const id = `emergency:${e.id}`;
      open.add(id);
      upsertNotice({
        id,
        roomId,
        kind: 'emergency',
        title: en.chat.emergencyNotice(names.get(e.userId) ?? en.chat.formerMember),
        createdAt: Date.parse(e.createdAt),
        action: { kind: 'open-chat' },
      });
    }
    for (const n of roomNotices(roomId).notices) {
      if (n.kind === 'emergency' && !open.has(n.id)) removeNotice(n.id);
    }
  }, [emergencies, roomId, userId, names]);
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  rtRow: { flexDirection: 'row', alignItems: 'center' },
  rtIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.onTint, fontVariant: ['tabular-nums'] },
  ends: { fontSize: 14, color: colors.ink2, fontVariant: ['tabular-nums'], marginBottom: 4 },
  empty: { fontSize: 15, color: colors.ink2, paddingVertical: 12 },
  // MuteBar pads itself by 24; pulled in so its label lines up with the rows above.
  settingsExtra: { gap: 6 },
});
