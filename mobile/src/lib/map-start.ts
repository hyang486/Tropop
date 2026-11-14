// UX P1-8: where the room map opens. Never MapKit's default world region: live positions (the fit), else the
// meeting place pin, else the saved route (the fit), else my own position, else a regional default. A single point
// opens at about a 1.5 km span across the map. No runtime imports, so node tests load it directly.
import type { Camera, LatLng } from './location-plan';

/** Span across the map for a single point (meeting place or my position). */
export const START_SPAN_M = 1500;
/** The map's width in points that the span covers (the room map is about 360 pt wide). */
const MAP_WIDTH_PT = 360;
/** Meters per point at zoom 0 on the equator (256 pt Web Mercator tiles). */
const METERS_PER_PT_Z0 = 156_543.03;

/** The zoom at which `spanM` fills the map's width at this latitude, capped at `maxZoom` (the map's closest). */
export function spanZoom(latitude: number, maxZoom: number, spanM = START_SPAN_M): number {
  const metersPerPt = spanM / MAP_WIDTH_PT;
  const zoom = Math.log2((METERS_PER_PT_Z0 * Math.cos((latitude * Math.PI) / 180)) / metersPerPt);
  return Math.min(maxZoom, Math.round(zoom * 10) / 10);
}

export type StartCamera = {
  camera: Camera;
  /** 3 live positions or place or route (final), 2 my position, 1 regional default. A higher rank replaces a lower one. */
  rank: 1 | 2 | 3;
};

export function mapStartCamera(input: {
  /** The fit over live positions (and the route), or null when nobody shares a position. */
  livePointsCamera: Camera | null;
  place: LatLng | null;
  /** The fit over the saved route, or null with no route. */
  routeCamera: Camera | null;
  mine: LatLng | null;
  /** regionalDefaultCamera(time zone): a city-level view, never the world. */
  regional: Camera;
  maxZoom: number;
}): StartCamera {
  if (input.livePointsCamera) return { camera: input.livePointsCamera, rank: 3 };
  if (input.place) return { camera: { coordinates: input.place, zoom: spanZoom(input.place.latitude, input.maxZoom) }, rank: 3 };
  if (input.routeCamera) return { camera: input.routeCamera, rank: 3 };
  if (input.mine) return { camera: { coordinates: input.mine, zoom: spanZoom(input.mine.latitude, input.maxZoom) }, rank: 2 };
  return { camera: input.regional, rank: 1 };
}
