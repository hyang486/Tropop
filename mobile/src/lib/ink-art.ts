// Qrew redesign: the one asset map for room art, and the dev drawings. Pure (the PNG sources are required by
// components/ink-art, so this file has no React Native imports and is unit tested).
import type { RoomTheme } from './room-theme';

// Qrew redesign R4: ink art DRAWN BY DEV (placeholder quality until the human accepts it), in the thin pen
// style of the design PDF: one stroke width, round caps, no fill. Bicycle (thin diamond frame, spoked wheels)
// and motorcycle (double tyres, tank, engine block) differ in silhouette at row size.
// Pure data: rendered by components/ink-art with react-native-svg (already in the installed builds).

export type InkDrawing = { viewBox: string; width: number; height: number; paths: string[] };

export const DRAWN_BY_DEV = true;

export const INK_DRAWINGS = {
  hike: {
    viewBox: '0 0 300 240',
    width: 300,
    height: 240,
    paths: [
      'M12 204 Q46 160 80 112 Q98 132 114 150 Q132 120 150 96 Q163 114 176 132',
      'M74 122 Q82 130 90 128 M144 104 Q152 112 160 108',
      'M18 224 Q90 214 160 218 Q226 222 286 216',
      'M205 56 C217 56 219 72 211 80 C203 86 190 82 191 70 C192 62 197 56 205 56 Z',
      'M190 66 Q204 50 220 60 L229 63',
      'M202 84 Q198 112 197 141',
      'M191 88 Q172 89 171 108 L173 137 Q175 147 189 145 L197 142',
      'M183 89 Q185 79 195 83 M178 112 L192 113',
      'M203 91 Q211 102 205 116',
      'M204 94 Q215 108 226 117 Q230 120 229 114',
      'M227 98 L241 223',
      'M199 96 Q190 116 182 130',
      'M197 141 Q211 168 214 199 Q222 203 231 204 Q233 199 224 196',
      'M197 141 Q186 171 174 196 Q167 205 181 207 Q186 204 182 199',
    ],
  },
  bike: {
    viewBox: '0 0 300 220',
    width: 300,
    height: 220,
    paths: [
      'M75 116 C100 116 120 136 120 161 C120 186 100 206 75 206 C50 206 30 186 30 161 C30 136 50 116 75 116 Z',
      'M225 116 C250 116 270 136 270 161 C270 186 250 206 225 206 C200 206 180 186 180 161 C180 136 200 116 225 116 Z',
      'M75 158 L75 164 M72 161 L78 161 M225 158 L225 164 M222 161 L228 161',
      'M75 161 L48 134 M75 161 L104 140 M75 161 L56 192 M75 161 L100 186',
      'M225 161 L198 140 M225 161 L252 136 M225 161 L206 190 M225 161 L250 188',
      'M141 161 L124 96 M124 96 Q166 98 204 101 M204 101 L141 161 M141 161 L75 161 M124 96 L75 161',
      'M204 101 Q214 130 225 161',
      'M204 101 L208 82 M198 80 Q212 75 222 84 Q225 89 219 90',
      'M110 92 Q124 86 140 91',
      'M141 153 C146 153 149 156 149 161 C149 166 146 169 141 169 C136 169 133 166 133 161 C133 156 136 153 141 153 Z',
      'M141 161 L150 176 M144 177 L158 175',
    ],
  },
  motorcycle: {
    viewBox: '0 0 300 220',
    width: 300,
    height: 220,
    paths: [
      'M70 118 C94 118 112 136 112 160 C112 184 94 202 70 202 C46 202 28 184 28 160 C28 136 46 118 70 118 Z',
      'M70 128 C88 128 102 142 102 160 C102 178 88 192 70 192 C52 192 38 178 38 160 C38 142 52 128 70 128 Z',
      'M232 118 C256 118 274 136 274 160 C274 184 256 202 232 202 C208 202 190 184 190 160 C190 136 208 118 232 118 Z',
      'M232 128 C250 128 264 142 264 160 C264 178 250 192 232 192 C214 192 200 178 200 160 C200 142 214 128 232 128 Z',
      'M70 153 C74 153 77 156 77 160 C77 164 74 167 70 167 C66 167 63 164 63 160 C63 156 66 153 70 153 Z',
      'M232 153 C236 153 239 156 239 160 C239 164 236 167 232 167 C228 167 225 164 225 160 C225 156 228 153 232 153 Z',
      'M120 100 Q150 80 186 95 L179 113 Q150 108 124 115 Z',
      'M66 104 Q94 95 122 103 L121 115 Q94 112 68 117 Z',
      'M126 118 L171 118 L177 150 L132 153 Z',
      'M131 128 L173 128 M133 139 L175 139',
      'M131 150 Q100 154 70 160',
      'M186 95 L232 160 M180 102 L224 162',
      'M182 82 L197 75 Q207 72 211 81',
      'M205 94 C211 94 215 98 215 104 C215 110 211 114 205 114 C199 114 195 110 195 104 C195 98 199 94 205 94 Z',
      'M134 158 Q172 176 216 170 L223 176',
      'M38 140 Q66 106 104 124',
      'M204 128 Q232 110 264 132',
    ],
  },
  meetup: {
    viewBox: '0 0 300 230',
    width: 300,
    height: 230,
    paths: [
      'M100 44 C112 44 116 56 114 64 C111 74 98 78 90 70 C84 64 86 48 100 44 Z',
      'M86 56 Q90 38 106 40 Q118 42 116 54',
      'M106 62 Q108 66 104 67',
      'M94 80 Q80 122 82 172 L118 172 Q120 124 107 80',
      'M110 92 Q128 82 140 62 Q143 55 148 58 Q150 62 145 66',
      'M92 98 Q84 120 90 140',
      'M92 172 L89 206 Q82 210 94 211 M110 172 L114 206 Q122 210 110 211',
      'M200 48 C212 48 216 60 214 68 C211 78 198 82 190 74 C184 68 186 52 200 48 Z',
      'M184 58 Q198 40 216 54 L222 58',
      'M192 66 Q190 70 194 71',
      'M192 84 Q180 126 186 174 L216 174 Q220 126 208 84',
      'M190 94 Q172 84 160 62 Q157 55 152 58 Q150 62 155 66',
      'M208 98 Q218 122 210 142',
      'M194 174 L190 207 Q182 211 194 212 M210 174 L216 207 Q224 211 212 212',
      'M150 44 L150 32 M139 47 L132 38 M161 47 L168 38',
      'M30 214 Q150 206 270 216',
    ],
  },
} satisfies Record<string, InkDrawing>;

/** Extracted from the design PDF with a transparent background (scripts/ink-art-extract.mjs). */
export type ArtImageKey = 'run' | 'gathering';
/** Drawn by dev in the same pen style (lib/ink-drawings). */
export type ArtDrawingKey = keyof typeof INK_DRAWINGS;
export type ArtKey = ArtImageKey | ArtDrawingKey;

export type ArtEntry = { kind: 'image'; key: ArtImageKey; aspect: number } | { kind: 'drawing'; key: ArtDrawingKey; aspect: number };

/** Pixel sizes of the extracted PNGs (width / height = aspect). */
const IMAGE_ASPECT: Record<ArtImageKey, number> = { run: 305 / 281, gathering: 646 / 442 };

/** Theme → art. Every theme has an entry; a key missing from the map falls back to the gathering art. */
const THEME_ART: Partial<Record<RoomTheme, ArtKey>> = {
  run: 'run',
  hike: 'hike',
  bike: 'bike',
  motorcycle: 'motorcycle',
  gathering: 'gathering',
};

export function artEntry(key: ArtKey): ArtEntry {
  if (key === 'run' || key === 'gathering') return { kind: 'image', key, aspect: IMAGE_ASPECT[key] };
  const d = INK_DRAWINGS[key];
  return { kind: 'drawing', key, aspect: d.width / d.height };
}

/** The art for a room theme, or the gathering art when the theme has none. */
export function themeArt(theme: RoomTheme): ArtEntry {
  return artEntry(THEME_ART[theme] ?? 'gathering');
}
