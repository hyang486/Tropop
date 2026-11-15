import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/components/ui';

import { ReactionBar } from './reaction-bar';

/** B3: the reaction bar over a scrim, opened from a message's long-press menu ("React"). Tap = toggle yours and close. */
export function ReactionPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (reaction: number) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} accessibilityRole="button" accessibilityLabel="Close reactions" onPress={onClose}>
        <View>
          <ReactionBar
            onPick={(id) => {
              onClose();
              onPick(id);
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scrim },
});
