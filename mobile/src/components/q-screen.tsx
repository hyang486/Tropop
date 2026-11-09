import type { ReactElement, ReactNode } from 'react';
import { type RefreshControlProps, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { colors } from '@/components/ui';
import { useHeaderOverlap } from '@/lib/use-header-overlap';

/**
 * Qrew screen scaffold (human rule USER_DECISIONS:168: match Qrew_heytea_UI.pdf). As in Q 01.04:
 * handwritten title at the top of the content, a scrolling body (cards, art, text) with 24 pt sides and 12 pt
 * gaps, and the screen's actions pinned to the bottom above the home indicator, with an optional caption under
 * them ("Guest name comes next." in Q). The nav header keeps only the back button (screens set headerTitle '').
 * Not keyboard-aware yet: a screen with text fields adds that when it adopts the scaffold.
 */
export function QScreen({
  title,
  children,
  actions,
  bottom,
  refreshControl,
}: {
  title?: string;
  children?: ReactNode;
  /** Pinned bottom block: buttons, then a caption (QCaption). */
  actions?: ReactNode;
  /**
   * Body content anchored to the bottom of the scroll area, just above the actions (Q 01.04: the art sits
   * directly above Join). Free space goes between children and this block; it scrolls normally on overflow.
   */
  bottom?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const insets = useSafeAreaInsets();
  // Pad the top by the header overlap ourselves instead of contentInsetAdjustmentBehavior "automatic": that
  // inset is added on top of a body that already fills the frame (flexGrow), so the `bottom` block was pushed
  // under the actions by the header height (qa c-nonmember at 1ab2fd1).
  const { rootRef, onLayout, overlap } = useHeaderOverlap();
  return (
    <View ref={rootRef} onLayout={onLayout} style={styles.root}>
      <ScrollView
        style={styles.flex}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.body, { paddingTop: overlap + 8 }]}
        contentInsetAdjustmentBehavior="never"
        scrollToOverflowEnabled
        keyboardShouldPersistTaps="handled"
      >
        {title ? <HandTitle style={styles.title}>{title}</HandTitle> : null}
        {children}
        {bottom ? (
          <>
            <View style={styles.spacer} />
            {bottom}
          </>
        ) : null}
      </ScrollView>
      {actions ? <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>{actions}</View> : null}
    </View>
  );
}

/** The small centered gray line under the pinned actions (Q 01.04 "Guest name comes next."). */
export function QCaption({ children }: { children: ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

export const qSpacing = { side: 24, gap: 12 } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: qSpacing.side, paddingBottom: 24, gap: qSpacing.gap },
  title: { marginBottom: 6 },
  spacer: { flexGrow: 1 },
  caption: { fontSize: 13, color: colors.secondaryLabel, textAlign: 'center', fontVariant: ['tabular-nums'] },
  actions: { paddingHorizontal: qSpacing.side, paddingTop: 12, gap: qSpacing.gap, backgroundColor: colors.background },
});
