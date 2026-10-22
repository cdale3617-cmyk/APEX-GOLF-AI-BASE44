import { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { haversineYards, bearingBetween } from '@/lib/golfData';

const R = 6378137;
const COMPASS_BEARINGS = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

// Point `meters` away from `start` on `bearing`.
function destPoint(start, bearingDeg, meters) {
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (start[0] * Math.PI) / 180;
  const lng1 = (start[1] * Math.PI) / 180;
  const dr = meters / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dr) * Math.cos(lat1),
      Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

const arrowIcon = (rotation, duration, delay, opacity) =>
  L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg);opacity:${opacity}">
      <svg class="wind-arrow-glyph" style="--wind-dur:${duration}s;--wind-delay:${delay}s;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.9))" width="18" height="12" viewBox="0 0 18 12" fill="none">
        <path d="M1 6h12" stroke="#e8fbff" stroke-width="2.2" stroke-linecap="round" />
        <path d="M10 2.4 14.6 6 10 9.6" stroke="#e8fbff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

/**
 * Small drifting arrows spread across the hole, showing where the wind is
 * blowing TO (a wind named "NE" travels south-west).
 */
export default function WindArrows({ coords, env }) {
  const arrows = useMemo(() => {
    const speed = env?.windSpeed ?? 0;
    if (!speed) return [];
    const source = COMPASS_BEARINGS[env.windDir] ?? 0;
    const travel = (source + 180) % 360;
    const holeBearing = bearingBetween(coords.tee, coords.pin);
    const holeMeters = haversineYards(coords.tee, coords.pin) * 0.9144;
    if (!Number.isFinite(holeBearing) || !holeMeters) return [];

    const rotation = travel - 90; // CSS rotation is clockwise from east
    const duration = Math.max(0.9, 2.6 - speed * 0.055).toFixed(2);
    const opacity = Math.min(1, 0.55 + speed / 60);

    const along = [0.2, 0.5, 0.8];
    const across = [-18, 0, 18];
    const points = [];
    along.forEach((fraction, row) => {
      across.forEach((offset, column) => {
        const onLine = destPoint(coords.tee, holeBearing, holeMeters * fraction);
        points.push({
          key: `${row}-${column}`,
          position: destPoint(onLine, holeBearing + 90, offset),
          delay: (row * 0.18 + column * 0.26).toFixed(2),
        });
      });
    });
    return points.map((point) => ({
      ...point,
      icon: arrowIcon(rotation, duration, point.delay, opacity),
    }));
  }, [coords, env]);

  return arrows.map((arrow) => (
    <Marker
      key={arrow.key}
      position={arrow.position}
      icon={arrow.icon}
      interactive={false}
      keyboard={false}
    />
  ));
}