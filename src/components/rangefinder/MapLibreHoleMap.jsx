import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TriangleAlert } from 'lucide-react';
import { bearingBetween, haversineYards } from '@/lib/golfData';
import { distanceUnit, toDisplayDistance } from '@/lib/units';
import { buildShotPlan } from '@/lib/shotPlanGeometry';
import { buildHoleCamera } from '@/lib/holeCamera';

// MapLibre 6 expects a sibling worker module. Vite must bundle it explicitly;
// otherwise the production website/APK requests a file that does not exist.
maplibregl.setWorkerUrl(mapWorkerUrl);

/** @type {import('geojson').FeatureCollection} */
const EMPTY = { type: 'FeatureCollection', features: [] };

/** @returns {maplibregl.StyleSpecification} */
const baseStyle = (satellite, offline) => ({
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
    { id: 'background', type: 'background', paint: { 'background-color': '#0a170d' } },
    { id: 'dark', type: 'raster', source: 'dark', layout: { visibility: offline ? 'none' : 'visible' }, paint: { 'raster-opacity': satellite ? 0 : 1 } },
    { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: offline ? 'none' : 'visible' }, paint: { 'raster-opacity': satellite ? 1 : 0 } },
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
  { key: 'tee', color: '#D94B4B', name: 'Tee' },
  { key: 'layup', color: '#EAB308', name: 'Lay-up' },
  { key: 'pin', color: '#22C55E', name: 'Green' },
];

// The large invisible hit area stays easy to drag on a phone; only the
// small 12-pixel dot is painted over the satellite course.
const markerElement = (key, color, name) => {
  const hitArea = document.createElement('div');
  hitArea.style.cssText = 'position:absolute;width:64px;height:64px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;z-index:10;pointer-events:auto;';
  hitArea.dataset.markerKey = key;
  hitArea.setAttribute('title', `Drag ${name} to reposition`);
  hitArea.setAttribute('aria-label', name);

  // The coloured dot is rendered by the map's own GeoJSON circle layer.
  // This element is an invisible, touch-friendly handle only.

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
  element.setAttribute('aria-label', `Target ${text}; drag to change`);
}

export default function MapLibreHoleMap({
  coords,
  focus,
  courseCenter,
  activeHole = null,
  holeReady = false,
  units = 'metric',
  gpsFix = null,
  gpsMode = 'preview',
  playerFocusNonce = 0,
  graphics,
  pitchOn = true,
  satellite = true,
  offline = false,
  onMoveTarget,
  onPinSettled,
  holeKey = '',
}) {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  /** @type {import('react').MutableRefObject<Partial<Record<'tee'|'layup'|'pin', maplibregl.Marker>>>} */
  const markersRef = useRef({});
  /** @type {import('react').MutableRefObject<Partial<Record<'tee'|'layup'|'pin', boolean>>>} */
  const locksRef = useRef({});
  const holeKeyRef = useRef(holeKey);
  if (holeKeyRef.current !== holeKey) {
    holeKeyRef.current = holeKey;
    try { locksRef.current = JSON.parse(localStorage.getItem(`apex_marker_locks_${holeKey}`) || '{}'); }
    catch { locksRef.current = {}; }
  }
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState('');

  // Latest values the map's own event handlers need, without re-binding them.
  const latest = useRef({ coords, onMoveTarget, onPinSettled, pitchOn, units, gpsFix, gpsMode });
  latest.current = { coords, onMoveTarget, onPinSettled, pitchOn, units, gpsFix, gpsMode };

  const validPoint = (point) =>
    Array.isArray(point) && point.length === 2 &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]);

  useEffect(() => {
    let map;
    const initialHole = { ...activeHole, ...coords };
    const initialView = holeReady ? buildHoleCamera(initialHole, {
      width: holderRef.current.clientWidth, height: holderRef.current.clientHeight, pitchOn,
      bearing: bearingBetween(initialHole.tee, initialHole.pin),
    }) : null;
    try {
      map = new maplibregl.Map({
        container: holderRef.current,
        style: baseStyle(satellite, offline),
        center: initialView?.center ?? (() => {
          const point = focus?.center || courseCenter || coords.tee;
          return [point[1], point[0]];
        })(),
        zoom: initialView?.zoom ?? 16.2,
        pitch: initialView?.pitch ?? 0,
        bearing: initialView?.bearing ?? 0,
        attributionControl: { compact: true },
      });
      if (initialView) map.jumpTo(initialView);
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
      // On the narrow portrait map the expanded credits cover playable points.
      // Keep the native info toggle and all attribution credits accessible.
      const attribution = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
      if (map.getContainer().clientWidth <= 640 && attribution?.classList.contains('maplibregl-compact')) {
        attribution.classList.remove('maplibregl-compact-show');
        attribution.removeAttribute('open');
      }
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
      map.addSource('player-position', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'player-position-halo',
        type: 'circle',
        source: 'player-position',
        paint: { 'circle-radius': 13, 'circle-color': '#4AA9DF', 'circle-opacity': .17, 'circle-stroke-width': 0 },
      });
      map.addLayer({
        id: 'player-position-dot',
        type: 'circle',
        source: 'player-position',
        paint: { 'circle-radius': 6, 'circle-color': '#4AA9DF', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 },
      });
      map.addLayer({
        id: 'shot-plan-line',
        type: 'line',
        source: 'shot-plan',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': ['match', ['get', 'leg'], 'aggressive', '#ef4444', '#facc15'],
          'line-width': ['match', ['get', 'leg'], 'aggressive', 2.2, 3.2],
          'line-dasharray': [2, 1.2],
        },
      });
      // A transparent finger-sized corridor over ONLY the yellow safe-route legs.
      // Without this, swiping the visible line pans the map instead of bending the plan.
      map.addLayer({
        id: 'shot-plan-drag-hit',
        type: 'line',
        source: 'shot-plan',
        filter: ['!=', ['get', 'leg'], 'aggressive'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#facc15',
          'line-width': 38,
          'line-opacity': 0.01,
        },
      });
      // Draw the red pin and both other dots in the SAME geographic source.
      // An independent HTML marker can lag behind a GeoJSON line on Android.
      map.addLayer({
        id: 'shot-plan-dots',
        type: 'circle',
        source: 'shot-plan',
        paint: {
          'circle-radius': 5.5,
          'circle-color': [
            'match', ['get', 'key'],
            'tee', '#D94B4B',
            'layup', '#EAB308',
            'pin', '#22C55E',
            '#FFFFFF',
          ],
          'circle-stroke-width': 1.3,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      setReady(true);
    });
    map.on('idle', () => {
      if (!holderRef.current || !map.getLayer('shot-plan-dots')) return;
      const points = map.queryRenderedFeatures({ layers: ['shot-plan-dots'] });
      holderRef.current.dataset.renderedPlanPoints = String(new Set(points.map((point) => point.properties.key).filter(Boolean)).size);
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

  // GeoJSON line and dot geometry update together from the same positions.
  // Marker DOM elements remain invisible 34px drag handles.
  const paintShotPlan = () => {
    const map = mapRef.current;
    const source = map?.getSource('shot-plan');
    if (!source) return;
    const live = {};
    for (const { key } of MARKERS) {
      const marker = markersRef.current[key];
      if (marker) {
        const point = marker.getLngLat();
        live[key] = [point.lat, point.lng];
      } else {
        live[key] = latest.current.coords[key];
      }
    }
    source.setData(buildShotPlan(live));
    setTargetDistance(
      markersRef.current.layup,
      latest.current.gpsMode === 'live' && latest.current.gpsFix
        ? latest.current.gpsFix.coords : live.tee,
      live.layup,
      latest.current.units,
    );
  };

  // Draggable TEE / TARGET / PIN handles, wired to the shot plan.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !holeReady) return undefined;

    MARKERS.forEach(({ key, color, name }) => {
      const marker = new maplibregl.Marker({
        element: markerElement(key, color, name),
        anchor: 'center',
        draggable: true,
        clickTolerance: 1,
      });
      const element = marker.getElement();
      // On Android, the map's pan gesture can win over a transparent marker.
      // Make the handle visibly identifiable and stop the gesture reaching the map.
      const handle = document.createElement('span');
      handle.style.cssText = `width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 4px rgba(0,0,0,.35);pointer-events:none;`;
      element.appendChild(handle);
      element.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });
      element.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
      const updateLock = () => {
        const locked = Boolean(locksRef.current[key]);
        marker.setDraggable(!locked);
        element.style.opacity = locked ? '0.7' : '1';
        element.style.cursor = locked ? 'not-allowed' : 'grab';
        element.title = locked ? `${name} locked — tap to unlock` : `${name} unlocked — drag, then tap to lock`;
      };
      const persistLock = (locked) => {
        locksRef.current[key] = locked;
        try { localStorage.setItem(`apex_marker_locks_${holeKeyRef.current}`, JSON.stringify(locksRef.current)); } catch {}
        updateLock();
      };
      let dragged = false;
      let touchStart = null;
      let ignoreClick = false;
      element.addEventListener('pointerdown', (event) => {
        dragged = false;
        touchStart = { x: event.clientX, y: event.clientY };
        event.stopPropagation();
      });
      element.addEventListener('pointerup', (event) => {
        event.stopPropagation();
        const moved = touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 12;
        touchStart = null;
        if (!dragged && !moved) {
          persistLock(!Boolean(locksRef.current[key]));
          ignoreClick = true;
        }
      });
      element.addEventListener('pointercancel', () => { touchStart = null; });
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (ignoreClick) { ignoreClick = false; return; }
        if (!dragged) persistLock(!Boolean(locksRef.current[key]));
      });
      updateLock();
      // Red endpoint and green line follow *during* the drag, rather than
      // waiting for React to commit the new coordinates at dragend.
      marker.on('drag', () => { dragged = true; paintShotPlan(); });
      marker.on('dragend', () => {
        dragged = true;
        const position = marker.getLngLat();
        paintShotPlan();
        latest.current.onMoveTarget(key, { lat: position.lat, lng: position.lng });
        if (key === 'pin') latest.current.onPinSettled?.();
      });
      const position = latest.current.coords[key];
      marker.setLngLat([position[1], position[0]]).addTo(map);
      markersRef.current[key] = marker;
    });
    paintShotPlan();

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    };
  }, [ready, holeReady]);

  // Swiping anywhere along the yellow line bends the saved route at TARGET.
  // Stop MapLibre's pan and zoom handlers for this one gesture, then restore
  // their original enabled state as soon as the finger is lifted.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !holeReady) return undefined;

    let active = false;
    let updated = null;
    let initialTarget = null;
    let panWasEnabled = false;
    let zoomWasEnabled = false;

    const restore = () => {
      map.off('mousemove', dragMove);
      map.off('touchmove', dragMove);
      map.off('mouseup', finish);
      map.off('touchend', finish);
      map.off('touchcancel', cancel);
      map.getCanvas().style.cursor = '';
      if (panWasEnabled) map.dragPan.enable();
      if (zoomWasEnabled) map.touchZoomRotate.enable();
    };

    const dragMove = (event) => {
      if (!active || (event.type === 'touchmove' && event.points?.length !== 1)) return;
      const { lat, lng } = event.lngLat ?? {};
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const target = markersRef.current.layup;
      if (!target) return;
      updated = { lat, lng };
      target.setLngLat([lng, lat]);
      paintShotPlan();
    };

    const endDrag = (commit) => {
      if (!active) return;
      active = false;
      restore();
      if (commit && updated) {
        latest.current.onMoveTarget('layup', updated);
      } else if (initialTarget && markersRef.current.layup) {
        markersRef.current.layup.setLngLat(initialTarget);
        paintShotPlan();
      }
      updated = null;
      initialTarget = null;
    };

    function finish(event) {
      // touchend includes the lifted finger's location in MapLibre's lngLat.
      dragMove(event);
      endDrag(true);
    }
    function cancel() { endDrag(false); }

    const start = (event) => {
      if (active || !markersRef.current.layup || locksRef.current.layup) return;
      if (event.type === 'touchstart' && event.points?.length !== 1) return;
      // Preserve native dragging when the actual TEE / TARGET / PIN dot is grabbed.
      if (event.originalEvent?.target?.closest?.('.maplibregl-marker')) return;
      event.preventDefault();
      map.stop();
      active = true;
      updated = null;
      const target = markersRef.current.layup.getLngLat();
      initialTarget = [target.lng, target.lat];
      panWasEnabled = map.dragPan.isEnabled();
      zoomWasEnabled = map.touchZoomRotate.isEnabled();
      map.dragPan.disable();
      map.touchZoomRotate.disable();
      map.getCanvas().style.cursor = 'grabbing';
      map.on('mousemove', dragMove);
      map.on('touchmove', dragMove);
      map.on('mouseup', finish);
      map.on('touchend', finish);
      map.on('touchcancel', cancel);
    };

    map.on('mousedown', 'shot-plan-drag-hit', start);
    map.on('touchstart', 'shot-plan-drag-hit', start);
    return () => {
      endDrag(false);
      map.off('mousedown', 'shot-plan-drag-hit', start);
      map.off('touchstart', 'shot-plan-drag-hit', start);
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
    if (holeReady) paintShotPlan();
  }, [coords, units, gpsFix, gpsMode, holeReady, ready]);

  // Replace every layer, including empty ones. Never leave the previous hole
  // visible while the next hole's artwork is loading or unavailable.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    FILLS.forEach(({ id }) => {
      const source = map.getSource(id);
      if (source?.setData) source.setData(graphics?.[id] ?? EMPTY);
    });
  }, [graphics, ready]);

  // The live phone position is a separate dot, never an editable tee marker.
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource('player-position');
    if (!source) return;
    source.setData(gpsMode === 'live' && gpsFix ? {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { accuracy: gpsFix.accuracy },
        geometry: { type: 'Point', coordinates: [gpsFix.coords[1], gpsFix.coords[0]] },
      }],
    } : EMPTY);
  }, [ready, gpsFix, gpsMode]);

  // Locate button centres on the player without changing tee/target/pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !playerFocusNonce || gpsMode !== 'live' || !gpsFix) return;
    map.easeTo({
      center: [gpsFix.coords[1], gpsFix.coords[0]],
      zoom: Math.max(map.getZoom(), 16.5),
      duration: 450,
    });
  }, [playerFocusNonce, ready]);

  // Clear old course geometry when no active mapped hole is available.
  useEffect(() => {
    const source = mapRef.current?.getSource('shot-plan');
    if (!source) return;
    if (!holeReady) source.setData(EMPTY);
    else paintShotPlan();
  }, [coords, ready, holeReady]);

  // The parent only enables the map for coordinates keyed to this exact hole.
  // Frame those displayed points, including restored plans, on navigation.
  // Marker drags and ordinary pans do not retrigger automatic framing.
  const frameCameraRef = useRef(null);
  frameCameraRef.current = (duration = 350) => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const container = map.getContainer();
    if (!container.clientWidth || !container.clientHeight) return;
    map.resize();
    const displayedHole = { ...activeHole, ...latest.current.coords };
    const view = holeReady ? buildHoleCamera(displayedHole, {
      width: container.clientWidth,
      height: container.clientHeight,
      pitchOn,
      bearing: validPoint(displayedHole.tee) && validPoint(displayedHole.pin) ? bearingBetween(displayedHole.tee, displayedHole.pin) : 0,
    }) : null;
    map.stop();
    if (!view) {
      const center = focus?.center || courseCenter || latest.current.coords.tee;
      if (validPoint(center)) map.jumpTo({ center: [center[1], center[0]], zoom: 13.8, pitch: 0, bearing: 0 });
      return;
    }
    map.easeTo({ ...view, duration });
  };

  useEffect(() => {
    if (!ready) return undefined;
    const frame = requestAnimationFrame(() => frameCameraRef.current?.());
    return () => cancelAnimationFrame(frame);
  }, [ready, activeHole, focus?.nonce, holeReady, courseCenter, pitchOn]);

  // Android WebView panels can settle their dimensions after the map loads.
  // Resize and re-fit only when the actual panel dimensions change.
  useEffect(() => {
    if (!ready || !holderRef.current || typeof ResizeObserver === 'undefined') return undefined;
    let frame;
    let previousWidth = -1;
    let previousHeight = -1;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0 || (width === previousWidth && height === previousHeight)) return;
      previousWidth = width;
      previousHeight = height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => frameCameraRef.current?.(0));
    });
    observer.observe(holderRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty('satellite', 'raster-opacity', satellite ? 1 : 0);
    map.setPaintProperty('dark', 'raster-opacity', satellite ? 0 : 1);
    map.setLayoutProperty('satellite', 'visibility', offline ? 'none' : 'visible');
    map.setLayoutProperty('dark', 'visibility', offline ? 'none' : 'visible');
  }, [satellite, offline, ready]);

  return (
    <div data-testid="hole-map-canvas" data-map-ready={ready} className="relative h-full w-full">
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
