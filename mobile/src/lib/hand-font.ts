// B1: titles use Source Sans 3 (Semibold) like everything else; the handwriting fonts are gone. The names stay so the
// calendar and Plus call sites keep working; both keys now resolve to the same family. Pure; unit tested.

export const HAND_FONT_LATIN = 'SourceSans3-Semibold';
export const HAND_FONT_KOREAN = HAND_FONT_LATIN;

export function handFontFor(_text: string) {
  return HAND_FONT_LATIN;
}
