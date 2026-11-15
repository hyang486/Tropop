import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { haptics } from '@/lib/haptics';

import { ReactionBar, ReactionGrid } from './reaction-bar';

/**
 * B3: the reaction bar over a scrim, opened from a message's long-press menu ("React"). "+" switches the same
 * Modal's content to the 12-grid (one Modal, never two stacked). Tap = toggle yours and close once.
 */
export function ReactionPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (reaction: number) => void }) {
  const [all, setAll] = useState(false);
  const close = () => {
    setAll(false);
    onClose();
  };
  const pick = (id: number) => {
    haptics.selection();
    close();
    onPick(id);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {all ? (
        <ReactionGrid onClose={close} onPick={pick} />
      ) : (
        <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel={en.chat.closeReactions} onPress={close}>
          <View>
            <ReactionBar onPick={pick} onMore={() => setAll(true)} />
          </View>
        </Pressable>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scrim },
});
