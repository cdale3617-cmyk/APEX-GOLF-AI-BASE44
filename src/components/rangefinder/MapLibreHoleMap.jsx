import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TriangleAlert } from 'lucide-react';
import { bearingBetween, haversineYards } from '@/lib/golfData';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

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
  { key: 'tee', color: '#18C2B8', name: 'Tee' },
  { key: 'layup', color: '#D7A441', name: 'Target' },
  { key: 'pin', color: '#D94B4B', name: 'Pin' },
];

// The large invisible hit area stays easy to drag on a phone; only the
// small 12-pixel dot is painted over the satellite course.
const markerElement = (key, color, name) => {
  const hitArea = document.createElement('div');
  hitArea.style.cssText = 'position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;';
  hitArea.setAttribute('title', `Drag ${name} to reposition`);
  hitArea.setAttribute('aria-label', name);

  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  dot.style.cssText = `display:block;width:12px;height:12px;flex:none;border-radius:50%;background:${color};border:1px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,.65);pointer-events:none;`;
  hitArea.appendChild(dot);

  if (key === 'layup') {
    // This separate readout stays beside the target rather than expanding
    // the yellow dot itself. It must never intercept dragging.
    const distance = document.createElement('span');
    distance.className = 'apex-target-distance';
    distance.style.cssText = 'position:absolute;left:27px;top:50%;transform:translateY(-50%);white-space:nowrap;pointer-events:none;background:rgba(9,17,31,.94);border:1px solid #D7A441;border-radius:5px;color:#FFF4CF;padding:2px 4px;font-family:Inter,system-ui,sans-serif;font-size:10px;font-weight:800;line-height:14px;font-variant-numeric:tabular-nums;box-shadow:0 1px 3px rgba(0,0,0,.5);';
    distance.textContent = '—';
    hitArea.appendChild(distance);
  }
  return hitArea;
};

function setTargetDistance(marker, tee, target, units) {
  if (!marker || !Array.isArray(tee) || !Array.isArray(target)) return;
  if (![...tee, ...target].every(Number.isFinite)) return;
  const text = `${toDisplayDistance(haversineYards(tee, target), units)} ${distanceUnit(units)}`;
  const element = marker.getElement();
  const distance = element.querySelector('.apex-target-distance');
  if (distance) distance.textContent = text;
  element.setAttribute('aria-label', `Target ${text} from tee; drag to change`);
}

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
  courseCenter,
  holeReady = false,
  units = 'metric',
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
  const latest = useRef({ coords, onMoveTarget, onPinSettled, pitchOn, units });
  latest.current = { coords, onMoveTarget, onPinSettled, pitchOn, units };

  const validPoint = (point) =>
    Array.isArray(point) && point.length === 2 &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]);

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({
        container: holderRef.current,
        style: baseStyle(satellite),
        center: (() => {
          const point = focus?.center || courseCenter || coords.tee;
          return [point[1], point[0]];
        })(),
        zoom: holeReady ? 16.2 : 13.8,
        pitch: 0,
        bearing: 0,
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
    if (!map || !ready || !holeReady) return undefined;

    MARKERS.forEach(({ key, color, name }) => {
      const marker = new maplibregl.Marker({
        element: markerElement(key, color, name),
        anchor: 'center',
        draggable: true,
      });
      if (key === 'tee' || key === 'layup') {
        // Refresh the distance while the tee or yellow target is being dragged.
        marker.on('drag', () => {
          const position = marker.getLngLat();
          const point = [position.lat, position.lng];
          const current = latest.current.coords;
          setTargetDistance(
            markersRef.current.layup,
            key === 'tee' ? point : current.tee,
            key === 'layup' ? point : current.layup,
            latest.current.units,
          );
        });
      }
      marker.on('dragend', () => {
        const position = marker.getLngLat();
        latest.current.onMoveTarget(key, { lat: position.lat, lng: position.lng });
        if (key === 'pin') latest.current.onPinSettled?.();
      });
      const position = latest.current.coords[key];
      marker.setLngLat([position[1], position[0]]).addTo(map);
      markersRef.current[key] = marker;
    });
    setTargetDistance(
      markersRef.current.layup,
      latest.current.coords.tee,
      latest.current.coords.layup,
      latest.current.units,
    );

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    };
  }, [ready, holeReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    MARKERS.forEach(({ key }) => {
      const position = coords[key];
      const marker = markersRef.current[key];
      const valid = Array.isArray(position) && Number.isFinite(position[0]) && Number.isFinite(position[1]);
      if (marker && valid) marker.setLngLat([position[1], position[0]]);
    });
    if (holeReady) setTargetDistance(markersRef.current.layup, coords.tee, coords.layup, units);
  }, [coords, units, holeReady, ready]);

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
      features: holeReady ? [
        legFeature(coords.tee, coords.layup, 'tee'),
        legFeature(coords.layup, coords.pin, 'pin'),
      ] : [],
    });
  }, [coords, ready, holeReady]);

  // First jump to the new course location, even while hole data is loading.
  // Then fit just the selected hole, not the whole course or a stale demo map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { tee, pin } = coords;
    if (!holeReady || !validPoint(tee) || !validPoint(pin)) {
      const center = focus?.center || courseCenter || tee;
      if (validPoint(center)) {
        map.jumpTo({ center: [center[1], center[0]], zoom: 13.8, pitch: 0, bearing: 0 });
      }
      return;
    }
    const samePoint = Math.abs(tee[0] - pin[0]) + Math.abs(tee[1] - pin[1]) < 0.00004;
    if (samePoint) {
      map.jumpTo({ center: [tee[1], tee[0]], zoom: 17, pitch: 0, bearing: 0 });
      return;
    }
    // Fit with safety margins so the tee/green stay outside the HUD areas.
    const width = map.getContainer().clientWidth || 390;
    const height = map.getContainer().clientHeight || 600;
    const side = Math.min(95, Math.max(34, width * 0.19));
    const top = Math.min(190, Math.max(100, height * 0.25));
    const bottom = Math.min(125, Math.max(75, height * 0.18));
    map.fitBounds([
      [Math.min(tee[1], pin[1]), Math.min(tee[0], pin[0])],
      [Math.max(tee[1], pin[1]), Math.max(tee[0], pin[0])],
    ], {
      padding: { top, bottom, left: side, right: side },
      maxZoom: 18.5,
      pitch: 0,
      bearing: 0,
      duration: 500,
    });
  }, [coords, focus?.nonce, holeReady, ready, courseCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { tee, pin } = latest.current.coords;
    map.easeTo({
      pitch: pitchOn && holeReady ? 40 : 0,
      bearing: pitchOn && holeReady ? bearingBetween(tee, pin) : 0,
      duration: 700,
    });
  }, [pitchOn, holeReady, ready]);

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