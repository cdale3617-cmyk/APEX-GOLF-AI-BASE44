import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import WindArrows from '@/components/rangefinder/WindArrows';
import DraggableLine from '@/components/rangefinder/DraggableLine';

const markerIcon = (color, label) =>
  L.divIcon({
    className: '',
    html: `<div style="width:13px;height:13px;border-radius:9999px;background:${color};border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:7px;font-weight:800;color:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.45);line-height:1">${label}</div>`,
    iconSize: [13, 13],
    iconAnchor: [6.5, 6.5],
  });

const TEE_ICON = markerIcon('#10b981', 'T');
const LAYUP_ICON = markerIcon('#f59e0b', 'L');
const PIN_ICON = markerIcon('#ef4444', 'P');

function MapFocus({ center, nonce }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (center && nonce) map.setView(center, 17, { animate: true });
  }, [center, nonce, map]);

  return null;
}

export default function MapCanvas({ coords, focus, onMove, onPinSettled, dispersionRadius, env }) {
  return (
    <MapContainer center={coords.tee} zoom={17} zoomControl={false} className="h-full w-full">
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={20}
        attribution="Tiles &copy; Esri"
      />
      <MapFocus center={focus.center} nonce={focus.nonce} />

      <WindArrows coords={coords} env={env} />

      <Polyline positions={[coords.tee, coords.layup]} pathOptions={{ color: '#39ff14', weight: 3, dashArray: '6 6' }} />
      <DraggableLine
        from={coords.layup}
        to={coords.pin}
        fromKey="layup"
        toKey="pin"
        onDrag={onMove}
        color="#f59e0b"
      />

      <Circle
        center={coords.pin}
        radius={dispersionRadius}
        pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.16, weight: 1.5, dashArray: '4 4' }}
      />

      <Marker
        position={coords.tee}
        draggable
        icon={TEE_ICON}
        eventHandlers={{ dragend: (event) => onMove('tee', event.target.getLatLng()) }}
      />
      <Marker
        position={coords.layup}
        draggable
        icon={LAYUP_ICON}
        eventHandlers={{ dragend: (event) => onMove('layup', event.target.getLatLng()) }}
      />
      <Marker
        position={coords.pin}
        draggable
        icon={PIN_ICON}
        eventHandlers={{
          dragend: (event) => {
            onMove('pin', event.target.getLatLng());
            onPinSettled();
          },
        }}
      />
    </MapContainer>
  );
}