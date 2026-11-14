import { createContext, useContext } from 'react';

/**
 * UX2-61: QScreen provides this around its `bottom` block. `hidden` says the art can't show whole there (keyboard
 * up, or no room); `report` gives QScreen the art's laid-out height. Outside a `bottom` block art always shows.
 */
export type ArtFit = { hidden: boolean; report: (height: number) => void };

export const ArtFitContext = createContext<ArtFit | null>(null);

export function useArtFit(): ArtFit | null {
  return useContext(ArtFitContext);
}
