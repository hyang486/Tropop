// Web-only stub: Apple Maps exists only on iOS. Screens that need a map show a placeholder instead.
const AppleMaps = { View: () => null, MapType: {}, MapColorScheme: {}, Emphasis: {} };
export { AppleMaps };
export type CameraMoveEvent = { coordinates: { latitude?: number; longitude?: number }; zoom?: number };
