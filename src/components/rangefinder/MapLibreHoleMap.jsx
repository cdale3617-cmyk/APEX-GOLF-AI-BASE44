import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TriangleAlert } from 'lucide-react';
import { bearingBetween } from '@/lib/golfData';

const EMPTY = { type: 'FeatureCollection', features: [] };

const baseStyle = (satellite) => ({
  version: 8,
  sources: {
    dark: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    },
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles &copy; Esri, Maxar',
    },
  },
  layers: [
    { id: 'dark', type: 'raster', source: 'dark', paint: { 'raster-opacity': satellite ? 0 : 1 } },
    { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-opacity': satellite ? 1 : 0 } },
  ],
});

const FILLS = [
  { id: 'rough', color: '#0a170d', opacity: 0.45 },
  { id: 'fairway', color: '#16a34a', opacity: 0.6 },
  { id: 'tee', color: '#22c55e', opacity: 0.6 },
  { id: 'green', color: '#4ade80', opacity: 0.85 },
  { id: 'bunker', color: '#facc15', opacity: 0.9 },
  { id: 'water', color: '#0284c7', opacity: 0.82 },
];

const MARKERS = [
  { key: 'tee', color: '#10b981', label: 'T' },
  { key: 'layup', color: '#f59e0b', label: 'TGT' },
  { key: 'pin', color: '#ef4444', label: 'P' },
];

const markerElement = (color, label) => {
  const element = document.createElement('div');
  element.style.cssText = `width:${label.length > 1 ? 30 : 22}px;height:22px;border-radius:9999px;background:${color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:8px;font-weight:800;color:#08111f;box-shadow:0 2px 6px rgba(0,0,0,0.45);line-height:1`;
  element.textContent = label;
  return element;
};

const legFeature = (from, to, leg) => ({
  type: 'Feature',
  properties: { leg },
  geometry: {
    type: 'LineString',
    coordinates: [
      [from[1], from[0]],
      [to[1], to[0]],
    ],
  },
});

export default function MapLibreHoleMap({
  coords,
  focus,
  graphics,
  pitchOn = true,
  satellite = true,
  onMoveTarget,
  onPinSettled,
}) {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');

  // Latest values the map's own event handlers need, without re-binding them.
  const latest = useRef({ coords, onMoveTarget, onPinSettled, pitchOn });
  latest.current = { coords, onMoveTarget, onPinSettled, pitchOn };

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({
        container: holderRef.current,
        style: baseStyle(satellite),
        center: [coords.tee[1], coords.tee[0]],
        zoom: 16.4,
        pitch: pitchOn ? 48 : 0,
        bearing: bearingBetween(coords.tee, coords.pin),
        attributionControl: { compact: true },
      });
    } catch (error) {
      // A device without working 3D graphics must never take the whole app down.
      setMapError(
        /webgl/i.test(error?.message ?? '')
          ? 'This device cannot draw the 3D course map. Your distances and club call still work below.'
          : error?.message || 'The course map could not start on this device.',
      );
      return undefined;
    }
    mapRef.current = map;

    map.on('load', () => {
      FILLS.forEach(({ id, color, opacity }) => {
        map.addSource(id, { type: 'geojson', data: EMPTY });
        map.addLayer({
          id,
          type: 'fill',
          source: id,
          paint: { 'fill-color': color, 'fill-opacity': opacity },
        });
      });

      map.addSource('shot-plan', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'shot-plan-line',
        type: 'line',
        source: 'shot-plan',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'leg'], 'tee', '#f59e0b', '#10b981'],
          'line-width': 2.5,
          'line-dasharray': [2, 1.2],
        },
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      setReady(false);
    };
    // The map is rebuilt per course through the `key` prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draggable TEE / TARGET / PIN markers, wired to the shot plan.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return undefined;

    MARKERS.forEach(({ key, color, label }) => {
      const marker = new maplibregl.Marker({ element: markerElement(color, label), draggable: true });
      marker.on('dragend', () => {
        const position = marker.getLngLat();
        latest.current.onMoveTarget(key, { lat: position.lat, lng: position.lng });
        if (key === 'pin') latest.current.onPinSettled?.();
      });
      const position = latest.current.coords[key];
      marker.setLngLat([position[1], position[0]]).addTo(map);
      markersRef.current[key] = marker;
    });

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    MARKERS.forEach(({ key }) => {
      const position = coords[key];
      const marker = markersRef.current[key];
      const valid = Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1]);
      if (marker && valid) marker.setLngLat([position[1], position[0]]);
    });
  }, [coords, ready]);

  // Course turf: fairway, green, bunker, water shapes from OpenStreetMap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !graphics) return;
    Object.entries(graphics).forEach(([id, data]) => {
      const source = map.getSource(id);
      if (source?.setData) source.setData(data);
    });
  }, [graphics, ready]);

  // The tee-to-target and target-to-pin legs.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource('shot-plan');
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: [legFeature(coords.tee, coords.layup, 'tee'), legFeature(coords.layup, coords.pin, 'pin')],
    });
  }, [coords, ready]);

  // Frame the hole whenever the hole, course or location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { tee, pin } = latest.current.coords;
    map.flyTo({
      center: [(tee[1] + pin[1]) / 2, (tee[0] + pin[0]) / 2],
      zoom: 16.4,
      pitch: latest.current.pitchOn ? 48 : 0,
      bearing: latest.current.pitchOn ? bearingBetween(tee, pin) : 0,
      duration: 1200,
    });
  }, [focus?.nonce, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { tee, pin } = latest.current.coords;
    map.easeTo({
      pitch: pitchOn ? 48 : 0,
      bearing: pitchOn ? bearingBetween(tee, pin) : 0,
      duration: 700,
    });
  }, [pitchOn, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty('satellite', 'raster-opacity', satellite ? 1 : 0);
    map.setPaintProperty('dark', 'raster-opacity', satellite ? 0 : 1);
  }, [satellite, ready]);

  return (
    <div className="relative h-full w-full">
      <div ref={holderRef} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-6">
          <div className="glass-panel max-w-xs rounded-2xl p-4 text-center">
            <TriangleAlert className="mx-auto h-5 w-5 text-warm" />
            <p className="mt-2 text-xs font-semibold leading-relaxed text-foreground">{mapError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg border border-border bg-muted/70 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-muted"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}