import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { haversineYards } from '@/lib/golfData';

const labels = ['TEE', 'LAYUP', 'GREEN'];
const colors = ['#D94B4B', '#EAB308', '#22C55E'];
const makeStyle = () => ({
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles © Esri, Maxar',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
});

/** Standalone course creator. It never changes the live GPS rangefinder map. */
export default function CoursePinCreator({ center, holeCount, onAddHole }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState([]);
  const [par, setPar] = useState(4);
  const [error, setError] = useState('');
  const centre = Array.isArray(center) && center.length === 2 ? center : [-23.09, 150.75];

  useEffect(() => {
    if (!nodeRef.current) return undefined;
    let map;
    try {
      map = new maplibregl.Map({
        container: nodeRef.current,
        style: makeStyle(),
        center: [centre[1], centre[0]],
        zoom: 16,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => setReady(true));
      map.on('click', (event) => {
        setPoints((prev) => {
          const point = [event.lngLat.lat, event.lngLat.lng];
          return prev.length === 3 ? [point] : [...prev, point];
        });
      });
    } catch {
      setError('Satellite map is not available on this device.');
    }
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (map) map.remove();
      mapRef.current = null;
    };
    // Deliberately initialize once; active course navigation must not rebuild the creator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = points.map(([lat, lng], i) => new maplibregl.Marker({ color: colors[i] })
      .setLngLat([lng, lat]).addTo(map));
  }, [points, ready]);

  const addHole = () => {
    if (points.length !== 3 || holeCount >= 18) return;
    const [tee, layup, pin] = points;
    onAddHole({
      tee, layup, pin, par,
      yards: haversineYards(tee, pin),
    });
    setPoints([]);
  };

  return (
    <section className="glass-panel space-y-2 rounded-2xl p-3">
      <h3 className="text-sm font-bold text-foreground">Pin-Drop Course Creator</h3>
      <p className="text-sm font-extrabold text-primary">Just tap the satellite map three times, in this order:</p>
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-foreground" aria-label="Pin colour guide">
        {labels.map((label, index) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: colors[index] }} />
            {index + 1}. {label}
          </span>
        ))}
      </div>
      <div ref={nodeRef} className="h-[250px] w-full overflow-hidden rounded-xl border border-border bg-muted" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs font-semibold text-primary">
        Hole {Math.min(18, holeCount + 1)} of 18 · {points.length === 3 ? 'All three placed: tap Add hole' : `Tap map for ${labels[points.length]}`}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="creator-par" className="text-xs text-muted-foreground">Par</label>
        <select id="creator-par" value={par} onChange={(e) => setPar(Number(e.target.value))}
          className="rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground">
          {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" onClick={() => setPoints([])}
          className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground">Clear pins</button>
        <button type="button" onClick={addHole} disabled={points.length !== 3 || holeCount >= 18}
          className="ml-auto rounded-lg border border-primary/50 bg-primary/20 px-3 py-2 text-xs font-bold text-primary disabled:opacity-40">
          Add hole
        </button>
      </div>
    </section>
  );
}
