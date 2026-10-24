import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Isolated golfTiles proof-of-concept. Does not alter Live Hole.
 * Supply a verified PMTiles URL and a matching golfTiles style JSON URL.
 * The PMTiles protocol package is dynamically imported only when needed.
 */
export default function GolfTilesTrial({ archiveUrl = '', styleUrl = '', center = [150.82, -23.26] }) {
  const holder = useRef(null);
  const [message, setMessage] = useState('Enter a verified golfTiles archive and style URL.');
  useEffect(() => {
    if (!archiveUrl || !styleUrl || !holder.current) return;
    let map;
    let protocol;
    let cancelled = false;
    (async () => {
      try {
        const { Protocol } = await import('pmtiles');
        if (cancelled) return;
        protocol = new Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile);
        const response = await fetch(styleUrl);
        if (!response.ok) throw new Error('Style could not be downloaded');
        const style = await response.json();
        // A trial must use the supplied archive, never a silently substituted demo course.
        const sources = Object.entries(style.sources || {});
        const pmSources = sources.filter(([, source]) => source.url?.startsWith('pmtiles://'));
        if (!pmSources.length) throw new Error('Style has no PMTiles vector source');
        pmSources.forEach(([, source]) => { source.url = 'pmtiles://' + archiveUrl; });
        map = new maplibregl.Map({ container: holder.current, style, center, zoom: 16, attributionControl: true });
        map.on('load', () => setMessage('Map loaded. Verify hole outlines and hazards against the actual course.'));
        map.on('error', (event) => setMessage(event.error?.message || 'Map tiles failed to load.'));
      } catch (error) {
        setMessage(error.message || 'Map trial failed');
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      if (protocol) maplibregl.removeProtocol('pmtiles');
    };
  }, [archiveUrl, styleUrl, center[0], center[1]]);
  return (
    <section className="h-full w-full relative">
      <div ref={holder} className="h-full min-h-[420px] w-full" />
      <div role="status" className="absolute bottom-2 left-2 right-2 rounded bg-black/80 text-white text-xs p-2 pointer-events-none">{message}</div>
    </section>
  );
}
