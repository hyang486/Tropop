// Web build of expo-maps' AppleMaps.View: the same props, drawn with Leaflet on OpenStreetMap tiles (no API key).
// Metro aliases 'expo-maps' to this file on web only, so iOS keeps the native Apple Maps view.
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type LatLng = { latitude: number; longitude: number };
type Camera = { coordinates: LatLng; zoom?: number };
type Annotation = {
  id?: string;
  coordinates?: LatLng;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  anchor?: { x: number; y: number };
  /** Web only: a data/https URL drawn instead of the text pill (the web pin baker passes it). */
  iconUrl?: string;
};
type Marker = { id?: string; coordinates?: LatLng; title?: string };
type Polyline = { id?: string; coordinates: LatLng[]; color?: string; width?: number };
type Props = {
  style?: StyleProp<ViewStyle>;
  cameraPosition?: Camera;
  annotations?: Annotation[];
  markers?: Marker[];
  polylines?: Polyline[];
  properties?: { isMyLocationEnabled?: boolean };
  onCameraMove?: (e: { coordinates: { latitude?: number; longitude?: number }; zoom?: number }) => void;
  onAnnotationClick?: (e: { id?: string }) => void;
  onMapClick?: (e: { coordinates: { latitude?: number; longitude?: number } }) => void;
};
export type MapView = { setCameraPosition: (camera: Camera) => Promise<void> };
export type CameraMoveEvent = { coordinates: { latitude?: number; longitude?: number }; zoom?: number };

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const AppleMapsView = forwardRef<MapView, Props>(function AppleMapsView(props, ref) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useImperativeHandle(ref, () => ({
    setCameraPosition: async (camera) => {
      map.current?.setView([camera.coordinates.latitude, camera.coordinates.longitude], camera.zoom ?? map.current.getZoom());
    },
  }));

  useEffect(() => {
    if (!el.current) return;
    const cam = latest.current.cameraPosition;
    const m = L.map(el.current, { center: cam ? [cam.coordinates.latitude, cam.coordinates.longitude] : [37.77, -122.42], zoom: cam?.zoom ?? 13, maxZoom: 19 });
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('moveend', () => {
      const c = m.getCenter();
      latest.current.onCameraMove?.({ coordinates: { latitude: c.lat, longitude: c.lng }, zoom: m.getZoom() });
    });
    m.on('click', (e: L.LeafletMouseEvent) =>
      latest.current.onMapClick?.({ coordinates: { latitude: e.latlng.lat, longitude: e.latlng.lng } }),
    );
    map.current = m;
    // A flex layout can settle after mount; Leaflet needs to re-measure.
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  // The first camera that arrives after mount (the screen sets it once, when the start view is known).
  const moved = useRef(false);
  const cam = props.cameraPosition;
  useEffect(() => {
    if (!cam || moved.current) return;
    moved.current = true;
    map.current?.setView([cam.coordinates.latitude, cam.coordinates.longitude], cam.zoom ?? 13);
  }, [cam]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const p of props.polylines ?? []) {
      L.polyline(p.coordinates.map((c) => [c.latitude, c.longitude] as [number, number]), { color: p.color ?? '#1a1a1a', weight: p.width ?? 4 }).addTo(g);
    }
    for (const mk of props.markers ?? []) {
      if (!mk.coordinates) continue;
      const m = L.circleMarker([mk.coordinates.latitude, mk.coordinates.longitude], { radius: 7, color: '#fff', weight: 2, fillColor: '#1a1a1a', fillOpacity: 1 });
      if (mk.title) m.bindTooltip(esc(mk.title));
      m.addTo(g);
    }
    for (const a of props.annotations ?? []) {
      if (!a.coordinates) continue;
      const text = a.text ?? '';
      const short = text.length <= 3 && !text.includes('\n');
      const ax = a.anchor?.x ?? 0.5;
      const ay = a.anchor?.y ?? 0.5;
      const size = short ? 'min-width:34px;height:34px;border-radius:17px;line-height:34px;font-size:15px' : 'padding:2px 8px;border-radius:12px;line-height:18px;font-size:12px';
      const html = a.iconUrl
        ? `<img src="${esc(a.iconUrl)}" alt="" style="transform:translate(${-ax * 100}%,${-ay * 100}%);display:block;max-width:none">`
        : `<div style="transform:translate(${-ax * 100}%,${-ay * 100}%);display:inline-block;text-align:center;white-space:pre;font:600 12px system-ui;box-sizing:border-box;` +
        `border:1px solid rgba(0,0,0,.15);box-shadow:0 1px 3px rgba(0,0,0,.25);${size};background:${a.backgroundColor ?? '#fff'};color:${a.textColor ?? '#1a1a1a'}">${esc(text)}</div>`;
      const marker = L.marker([a.coordinates.latitude, a.coordinates.longitude], { icon: L.divIcon({ className: '', iconSize: [0, 0], html }), keyboard: false });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        latest.current.onAnnotationClick?.({ id: a.id });
      });
      marker.addTo(g);
    }
  }, [props.annotations, props.markers, props.polylines]);

  // isMyLocationEnabled: the blue dot from the browser's geolocation while the screen asks for it.
  const showMe = props.properties?.isMyLocationEnabled === true;
  useEffect(() => {
    if (!showMe || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const g = layer.current ?? map.current;
        if (!g || !map.current) return;
        const at: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (me.current) me.current.setLatLng(at);
        else me.current = L.circleMarker(at, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map.current);
      },
      () => {},
      { enableHighAccuracy: true },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
      me.current?.remove();
      me.current = null;
    };
  }, [showMe]);

  return (
    <View style={props.style}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
});

const AppleMaps = {
  View: AppleMapsView,
  MapType: {},
  MapColorScheme: {},
  Emphasis: {},
  MapStyleElevation: { FLAT: 'FLAT', REALISTIC: 'REALISTIC', AUTOMATIC: 'AUTOMATIC' },
};
export { AppleMaps };
