import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const EMPTY = { type: 'FeatureCollection', features: [] };

const BASE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
      paint: { 'raster-brightness-max': 0.95, 'raster-contrast': 0.04 },
    },
  ],
};

// Drawn bottom to top: rough sits under the fairway, water over the sand.
const FILLS = [
  { id: 'rough', color: '#1e4026', opacity: 0.42 },
  { id: 'fairway', color: '#2f8040', opacity: 0.7 },
  { id: 'tee', color: '#3c9a4e', opacity: 0.72 },
  { id: 'green', color: '#5ac96d', opacity: 0.88 },
  { id: 'bunker', color: '#e9dcae', opacity: 0.92 },
  { id: 'water', color: '#2a7ba8', opacity: 0.82 },
];

const LINES = [{ id: 'hole', color: '#ffffff', width: 1.6, opacity: 0.45, dash: [2, 3] }];

const dotElement = (color, label) => {
  const element = document.createElement('div');
  element.style.cssText = `width:15px;height:15px;border-radius:9999px;background:${color};border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:8px;font-weight:800;color:#fff;box-shadow:0 1px 5px rgba(0,0,0,0.5);line-height:1`;
  element.textContent = label;
  return element;
};

export default function MapLibreCourseMap({ center, zoom = 16, graphics, tee, pin, showTurf = true }) {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: holderRef.current,
      style: BASE_STYLE,
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

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
      LINES.forEach(({ id, color, width, opacity, dash }) => {
        map.addSource(id, { type: 'geojson', data: EMPTY });
        map.addLayer({
          id,
          type: 'line',
          source: id,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': color,
            'line-width': width,
            'line-opacity': opacity,
            ...(dash ? { 'line-dasharray': dash } : {}),
          },
        });
      });
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The map is rebuilt per course by the `key` prop on this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !graphics) return;
    Object.entries(graphics).forEach(([id, data]) => {
      const source = map.getSource(id);
      if (source?.setData) source.setData(data);
    });
  }, [graphics, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    [...FILLS, ...LINES].forEach(({ id }) => {
      map.setLayoutProperty(id, 'visibility', showTurf ? 'visible' : 'none');
    });
  }, [showTurf, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return undefined;

    const markers = [];
    const add = (position, color, label) => {
      if (!position) return;
      markers.push(
        new maplibregl.Marker({ element: dotElement(color, label) })
          .setLngLat([position[1], position[0]])
          .addTo(map),
      );
    };
    add(tee, '#10b981', 'T');
    add(pin, '#ef4444', 'P');

    return () => markers.forEach((marker) => marker.remove());
  }, [tee, pin, ready]);

  return <div ref={holderRef} className="h-full w-full" />;
}