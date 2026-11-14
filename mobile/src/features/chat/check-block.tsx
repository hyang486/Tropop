import { Button, ContextMenu, Host, RNHostView } from '@expo/ui/swift-ui';
import * as Clipboard from 'expo-clipboard';
import { SymbolView } from 'expo-symbols';
import { type ReactElement, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { colors, size } from '@/components/ui';
import { en } from '@/i18n/en';

import { ChatSheet } from './chat-sheet';
import type { CheckSummary } from './message-checks-plan';

const DOUBLE_TAP_MS = 300;

/**
 * UX3-B09 (S3): a text bubble or media block that takes one ink check. Long-press opens the native context menu
 * ("Got it" / "Remove check", then "Copy" for text). Text bubbles also toggle on double-tap; media blocks do not
 * (their single tap opens the item). The pill hangs 6 pt under the block, leading for others, trailing for your own.
 */
export function CheckBlock({
  children,
  mine,
  check,
  copyText,
  doubleTap,
  onToggle,
  onShowCheckedBy,
}: {
  children: ReactElement;
  mine: boolean;
  check: CheckSummary | undefined;
  /** Text bubbles: the body for "Copy". Media blocks: undefined (no Copy item). */
  copyText?: string;
  doubleTap: boolean;
  onToggle: (viaDoubleTap: boolean) => void;
  onShowCheckedBy: () => void;
}) {
  const checked = !!check?.mine;
  const count = check?.count ?? 0;
  const lastTap = useRef(0);
  const actionLabel = checked ? en.chat.checkRemove : en.chat.checkAdd;

  const target = doubleTap ? (
    <Pressable
      onPress={() => {
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_MS) {
          lastTap.current = 0;
          onToggle(true);
        } else {
          lastTap.current = now;
        }
      }}
    >
      {children}
    </Pressable>
  ) : (
    children
  );

  return (
    <View
      style={[styles.wrap, mine ? styles.end : styles.start, count > 0 && styles.withPill]}
      accessibilityActions={[{ name: 'toggleCheck', label: actionLabel }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'toggleCheck') onToggle(false);
      }}
      accessibilityValue={count > 0 ? { text: en.chat.checkCount(count) } : undefined}
    >
      <Host matchContents>
        <ContextMenu>
          <ContextMenu.Items>
            <Button label={actionLabel} systemImage="checkmark" onPress={() => onToggle(false)} />
            {copyText != null ? (
              <Button label={en.chat.copy} systemImage="doc.on.doc" onPress={() => void Clipboard.setStringAsync(copyText)} />
            ) : null}
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <RNHostView matchContents>
              <View>{target}</View>
            </RNHostView>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
      {count > 0 ? (
        <Pressable
          onPress={onShowCheckedBy}
          hitSlop={11}
          accessibilityRole="button"
          accessibilityLabel={en.chat.checkCount(count)}
          accessibilityHint={en.chat.checkedByHint}
          style={[styles.pill, checked && styles.pillMine]}
        >
          <SymbolView name="checkmark" size={11} weight="semibold" tintColor={colors.label} />
          <Text style={styles.pillCount} maxFontSizeMultiplier={1.4}>
            {count}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Tap the pill: who checked this message, as avatars and names in 44 pt rows. */
export function CheckedBySheet({
  people,
  onClose,
}: {
  /** null hides the sheet. */
  people: { id: string; name: string; avatarPath: string | null | undefined }[] | null;
  onClose: () => void;
}) {
  return (
    <ChatSheet visible={people != null} title={en.chat.checkedByTitle} onClose={onClose}>
      <ScrollView style={styles.list}>
        {(people ?? []).map((p) => (
          <View key={p.id} style={styles.person} accessible accessibilityLabel={p.name}>
            <Avatar path={p.avatarPath} name={p.name} size={size.avatar} />
            <Text style={styles.personName} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </ChatSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  start: { alignItems: 'flex-start' },
  end: { alignItems: 'flex-end' },
  withPill: { marginBottom: 10 },
  pill: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.separator,
    backgroundColor: colors.background,
  },
  pillMine: { borderWidth: 1.5, borderColor: colors.label },
  pillCount: { fontSize: 12, fontWeight: '600', color: colors.label },
  list: { maxHeight: 360 },
  person: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { flex: 1, fontSize: 17, color: colors.label },
});
