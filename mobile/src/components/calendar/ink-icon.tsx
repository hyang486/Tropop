import { SymbolView, type SFSymbol } from 'expo-symbols';

import { inkIconKey, type InkIconKey } from './ink-icon-map';
import { useCalendarColors } from './tokens';

/** Item 7 A1: the 18 category glyphs are SF Symbols (the web stub maps each to its Lucide twin). */
const SF: Record<InkIconKey, SFSymbol> = {
  pin: 'mappin',
  party: 'party.popper',
  coffee: 'cup.and.saucer',
  run: 'figure.run',
  meal: 'fork.knife',
  cake: 'birthday.cake',
  bike: 'bicycle',
  ball: 'soccerball',
  music: 'music.note',
  book: 'book',
  plane: 'airplane',
  beach: 'beach.umbrella',
  hospital: 'cross.case',
  work: 'briefcase',
  cart: 'cart',
  heart: 'heart',
  hourglass: 'hourglass',
  chat: 'bubble.left',
};

/**
 * A room's or event's emoji shown as a category symbol in theme ink (near-black on light, light graphite on dark).
 * Decorative: the caller's element carries the words for VoiceOver (inkIconLabel), so the icon is hidden.
 */
export function InkIcon({ emoji, size = 22, color }: { emoji: string | null | undefined; size?: number; color?: string }) {
  const ink = useCalendarColors().ink;
  return (
    <SymbolView
      name={SF[inkIconKey(emoji)]}
      size={size}
      tintColor={color ?? ink}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
