import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import { CHARACTER_IMAGES } from '@/features/characters/character-art';
import { characterA11y, CHARACTERS } from '@/lib/characters';

/**
 * B3 "Choose a character" grid (profile-edit and the first run): a Photo tile first, then characters 1-12,
 * 4 columns measured with onLayout (gap 8, slot = floor((w - 24) / 4), art = slot - 11), radius 18. Selected = 2.5 pt Cardinal ring outside the tile (3 pt gap) + a Cardinal check.
 * The host screen owns the state: `selected` is 'photo' or a character id (null = none); onPickCharacter clears the
 * photo, onPickPhoto opens the existing photo picker. `photoNode` (72 pt art) previews a chosen photo inside the Photo tile.
 */
export function CharacterPicker({
  selected,
  onPickCharacter,
  onPickPhoto,
  photoNode,
}: {
  selected: 'photo' | number | null;
  onPickCharacter: (id: number) => void;
  onPickPhoto: () => void;
  photoNode?: ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const slot = width > 0 ? Math.floor((width - 3 * GAP) / 4) : 78;
  const art = { width: slot - 11, height: slot - 11 };
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Tile on={selected === 'photo'} slot={slot} label="Photo" onPress={onPickPhoto}>
        {photoNode ? (
          <View style={[styles.art, art]}>{photoNode}</View>
        ) : (
          <View style={[styles.art, art, styles.photoTile]}>
            <SymbolView name="camera" size={24} tintColor={colors.label} />
            <Text style={styles.photoLabel}>Photo</Text>
          </View>
        )}
      </Tile>
      {CHARACTERS.map((c) => (
        <Tile key={c.id} on={selected === c.id} slot={slot} label={characterA11y(c.id)} onPress={() => onPickCharacter(c.id)}>
          <Image source={CHARACTER_IMAGES[c.id][72]} style={[styles.art, art]} accessibilityIgnoresInvertColors />
        </Tile>
      ))}
    </View>
  );
}

function Tile({ on, slot, label, onPress, children }: { on: boolean; slot: number; label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={[styles.slot, { width: slot, height: slot }]}>
      <View style={[styles.ring, on && styles.ringOn]}>
        {children}
        {on && (
        <View style={styles.badge}>
          <SymbolView name="checkmark" size={12} weight="bold" tintColor={colors.onTint} />
        </View>
        )}
      </View>
    </Pressable>
  );
}

const GAP = 8;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  slot: { alignItems: 'center', justifyContent: 'center' },
  ring: { padding: 3, borderRadius: 21, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.tint },
  art: { borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden' },
  photoTile: { backgroundColor: colors.wash, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.label },
  badge: { position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
});
