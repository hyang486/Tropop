// UX2-04b: a Free asker taps "<name> answered your question": a read-only sheet with the question and the answer.
// Reading a person's answer is never behind Plus; only asking Qrewing more is (See Plus → from=ask).
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/components/enter-view';
import { HandTitle } from '@/components/hand-title';
import { qSpacing } from '@/components/q-screen';
import { Button, colors, radius } from '@/components/ui';
import { en } from '@/i18n/en';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';

import { loadCards, useRoomCards } from './question-store';
import { AnsweredCard } from './relayed-cards';

const s = en.questions;

/**
 * `cardId` null hides the sheet. See Plus runs `onSeePlus` once the sheet has slid away (Modal onDismiss), so the
 * push never races the dismiss animation.
 */
export function AnswerSheet({
  roomId,
  cardId,
  answerer,
  onClose,
  onSeePlus,
}: {
  roomId: string;
  cardId: string | null;
  answerer: (uid: string) => string;
  onClose: () => void;
  onSeePlus: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion(); // Reduce Motion: the sheet fades in instead of sliding.
  const { cards, loaded, failed } = useRoomCards(roomId);
  const card = cardId ? cards.find((c) => c.id === cardId && c.status === 'answered') : undefined;
  const plusAfter = useRef(false);
  // UX2-46: closes at once when a link or notification tap navigates.
  const instant = useDismissOnLink(cardId ? onClose : null);
  // UX2-109: the sheet opens on the tap. With no answered card in the cache yet, read the cards once more;
  // until that read ends it says Loading, then the answer, Couldn't load (Try again) or This question is gone.
  // The card this sheet last re-read for; it is checking until that read ends (no setState inside the effect).
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  const missing = !!cardId && !card;
  const checking = missing && checkedFor !== cardId;
  useEffect(() => {
    if (!missing || !cardId) return;
    let live = true;
    loadCards(roomId).finally(() => {
      if (live) setCheckedFor(cardId);
    });
    return () => {
      live = false;
    };
  }, [missing, cardId, roomId]);
  const [retrying, setRetrying] = useState(false);
  function retry() {
    setRetrying(true);
    loadCards(roomId).finally(() => setRetrying(false));
  }

  return (
    <Modal
      visible={!!cardId}
      transparent
      animationType={instant ? 'none' : reduceMotion ? 'fade' : 'slide'}
      onRequestClose={onClose}
      onDismiss={() => {
        if (!plusAfter.current) return;
        plusAfter.current = false;
        onSeePlus();
      }}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={s.done} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <ScrollView contentContainerStyle={styles.body} bounces={false}>
            <HandTitle>{s.yourQuestion}</HandTitle>
            {card ? (
              <>
                <AnsweredCard card={card} answerer={answerer(card.answererId)} onSheet />
                <Text style={styles.note}>{s.askMoreIsPlus}</Text>
                <Button
                  title={en.planPreview.seePlus}
                  variant="secondary"
                  accessibilityHint={en.qrewing.ask.seePlusHint}
                  onPress={() => {
                    plusAfter.current = true;
                    onClose();
                  }}
                />
              </>
            ) : checking || (!loaded && !failed) ? (
              <View style={styles.row} accessible accessibilityLabel={s.answerLoadingSpoken} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.ink2} />
                <Text style={styles.note}>{s.answerLoading}</Text>
              </View>
            ) : failed ? (
              // Pattern E: red cause line + one ink-outline Try again (36 pt in a 44 pt hit area, busy while it runs).
              <View style={styles.row} accessibilityLiveRegion="polite">
                <Text style={styles.failedText}>{s.answerFailed}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={s.tryAgain}
                  accessibilityState={{ disabled: retrying, busy: retrying }}
                  disabled={retrying}
                  onPress={retry}
                  hitSlop={4}
                  style={({ pressed }) => [styles.retry, (pressed || retrying) && { opacity: 0.5 }]}
                >
                  <Text style={styles.retryText} numberOfLines={1}>
                    {s.tryAgain}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.gone} accessibilityLiveRegion="polite">
                {s.answerGone}
              </Text>
            )}
          </ScrollView>
          <Button title={s.done} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: qSpacing.side,
    paddingTop: 8,
    gap: 12,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.grabber },
  body: { gap: 12 },
  note: { fontSize: 15, color: colors.ink2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  failedText: { flex: 1, fontSize: 15, color: colors.errorText },
  retry: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.label,
  },
  retryText: { fontSize: 15, fontWeight: '600', color: colors.label },
  gone: { fontSize: 17, color: colors.label },
});
