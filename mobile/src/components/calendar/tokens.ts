import { useColorScheme } from 'react-native';

import { palette } from '@/components/ui';

/**
 * Qrewing Calendar colors, light and dark pairs (react-native-svg needs plain strings). Ink comes from the app
 * palette; the cream paper and the highlighter set are calendar-only, so they live here, not in components/ui.
 */
export const CAL_COLORS = {
  light: {
    ink: palette.light.ink,
    paper: '#FBF6E9',
    rule: '#C8D6E5',
    margin: '#E6A3A3',
    highlighters: ['#FFE14D', '#FF9EC4', '#8FE39A', '#8FD3FF', '#FFB870', '#C7A8FF'],
    highlighterOpacity: 0.55,
  },
  dark: {
    ink: palette.dark.ink,
    paper: '#1D1B17',
    rule: '#3A4250',
    margin: '#7A4646',
    highlighters: ['#E8C93A', '#E07FA8', '#6CC27A', '#6BB6E6', '#E39A55', '#A98BE6'],
    highlighterOpacity: 0.5,
  },
} as const;

export type CalendarColors = (typeof CAL_COLORS)['light'] | (typeof CAL_COLORS)['dark'];

export function useCalendarColors(): CalendarColors {
  return useColorScheme() === 'dark' ? CAL_COLORS.dark : CAL_COLORS.light;
}

/** A stable default highlighter for an item (by a seed such as the room id) when the caller has no color. */
export function highlighterFor(colors: CalendarColors, seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors.highlighters[h % colors.highlighters.length];
}
