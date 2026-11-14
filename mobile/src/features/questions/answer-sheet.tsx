// UX2-04b: a Free asker taps "<name> answered your question": a read-only sheet with the question and the answer.
// Reading a person's answer is never behind Plus; only asking Qrewing more is (See Plus → from=ask).
import { useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/components/enter-view';
import { HandTitle } from '@/components/hand-title';
import { qSpacing } from '@/components/q-screen';
import { Button, colors } from '@/components/ui';
import { en } from '@/i18n/en';

import { useRoomCards } from './question-store';
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
  const { cards } = useRoomCards(roomId);
  const card = cardId ? cards.find((c) => c.id === cardId && c.status === 'answered') : undefined;
  const plusAfter = useRef(false);

  return (
    <Modal
      visible={!!card}
      transparent
      animationType={reduceMotion ? 'fade' : 'slide'}
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
            {card ? <AnsweredCard card={card} answerer={answerer(card.answererId)} onSheet /> : null}
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
});
