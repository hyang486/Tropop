// Web variant: no SwiftUI context menu. The bubble renders plainly; double-tap still toggles the check.
import { SymbolView } from 'expo-symbols';
import { type ReactElement, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { PersonAvatar } from '@/features/characters/person-avatar';
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
  onReact,
}: {
  children: ReactElement;
  mine: boolean;
  check: CheckSummary | undefined;
  /** Text bubbles: the body for "Copy". Media blocks: undefined (no Copy item). */
  copyText?: string;
  doubleTap: boolean;
  onToggle: (viaDoubleTap: boolean) => void;
  onShowCheckedBy: () => void;
  /** B3: opens the reaction bar for this message; adds a "React" item to the menu. */
  onReact?: () => void;
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
      accessibilityValue={count > 0 ? { text: en.chat.checkValue(count, checked) } : undefined}
    >
      {target}
      {count > 0 ? (
        <Pressable
          onPress={onShowCheckedBy}
          hitSlop={11}
          accessibilityRole="button"
          accessibilityLabel={en.chat.checkValue(count, checked)}
          accessibilityHint={en.chat.checkedByHint}
          style={[styles.pill, checked && styles.pillMine]}
        >
          <SymbolView name="checkmark" size={11} weight="semibold" tintColor={checked ? colors.onTint : colors.label} />
          <Text style={[styles.pillCount, checked && styles.pillCountMine]} maxFontSizeMultiplier={1.4}>
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
  people: { id: string; name: string; avatarPath: string | null | undefined; character?: number | null }[] | null;
  onClose: () => void;
}) {
  return (
    <ChatSheet visible={people != null} title={en.chat.checkedByTitle} onClose={onClose}>
      <ScrollView style={styles.list}>
        {(people ?? []).map((p) => (
          <View key={p.id} style={styles.person} accessible accessibilityLabel={p.name}>
            <PersonAvatar userId={p.id} name={p.name} path={p.avatarPath} character={p.character} size={size.avatar} />
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
    backgroundColor: colors.fieldStrong,
  },
  // ux 2026-11-14: no border; checked by me = ink fill with onTint content.
  pillMine: { backgroundColor: colors.label },
  pillCount: { fontSize: 12, fontWeight: '600', color: colors.label },
  pillCountMine: { color: colors.onTint },
  list: { maxHeight: 360 },
  person: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { flex: 1, fontSize: 17, color: colors.label },
});
