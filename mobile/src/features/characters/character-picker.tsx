import { SymbolView } from 'expo-symbols';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors } from '@/components/ui';
import { CHARACTER_IMAGES } from '@/features/characters/character-art';
import { characterA11y, CHARACTERS } from '@/lib/characters';

/**
 * B3 "Choose a character" grid (profile-edit and the first run): a Photo tile first, then characters 1-12,
 * 4 columns, 72 pt tiles, radius 18. Selected = 2.5 pt Cardinal ring outside the tile (3 pt gap) + a Cardinal check.
 * The host screen owns the state: `selected` is 'photo' or a character id (null = none); onPickCharacter clears the
 * photo, onPickPhoto opens the existing photo picker. `photoUri` previews a chosen photo inside the Photo tile.
 */
export function CharacterPicker({
  selected,
  onPickCharacter,
  onPickPhoto,
  photoUri,
}: {
  selected: 'photo' | number | null;
  onPickCharacter: (id: number) => void;
  onPickPhoto: () => void;
  photoUri?: string | null;
}) {
  return (
    <View style={styles.grid}>
      <Tile on={selected === 'photo'} label={selected === 'photo' ? 'Photo, selected' : 'Photo'} onPress={onPickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.photoTile]}>
            <SymbolView name="camera" size={24} tintColor={colors.label} />
            <Text style={styles.photoLabel}>Photo</Text>
          </View>
        )}
      </Tile>
      {CHARACTERS.map((c) => (
        <Tile key={c.id} on={selected === c.id} label={characterA11y(c.id, selected === c.id)} onPress={() => onPickCharacter(c.id)}>
          <Image source={CHARACTER_IMAGES[c.id][72]} style={styles.art} accessibilityIgnoresInvertColors />
        </Tile>
      ))}
    </View>
  );
}

function Tile({ on, label, onPress, children }: { on: boolean; label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={styles.slot}>
      <View style={[styles.ring, on && styles.ringOn]}>{children}</View>
      {on && (
        <View style={styles.badge}>
          <SymbolView name="checkmark" size={12} weight="bold" tintColor={colors.onTint} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slot: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  ring: { padding: 3, borderRadius: 21, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.tint },
  art: { width: 72, height: 72, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden' },
  photoTile: { backgroundColor: colors.wash, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.label },
  badge: { position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
});
