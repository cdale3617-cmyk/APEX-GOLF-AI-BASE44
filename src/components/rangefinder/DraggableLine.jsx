import { useEffect, useRef } from 'react';
import { Polyline, useMap } from 'react-leaflet';

const HIT_CLASS = 'apex-line-hit';

/**
 * A dashed shot line you can drag. Whichever end is nearer your finger follows
 * it. The grab is captured on the map container before Leaflet's own pan
 * handler sees it, so dragging the line never moves the map underneath it.
 */
export default function DraggableLine({ from, to, fromKey, toKey, onDrag, color = '#f59e0b' }) {
  const map = useMap();
  const activeRef = useRef(null);
  const latest = useRef({ from, to, fromKey, toKey, onDrag });
  latest.current = { from, to, fromKey, toKey, onDrag };

  useEffect(() => {
    const container = map.getContainer();
    const pointerOf = (event) => event.touches?.[0] ?? event.changedTouches?.[0] ?? event;

    const move = (event) => {
      if (!activeRef.current) return;
      if (event.cancelable) event.preventDefault();
      latest.current.onDrag(activeRef.current, map.mouseEventToLatLng(pointerOf(event)));
    };

    const release = () => {
      activeRef.current = null;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup', release);
      document.removeEventListener('touchend', release);
      document.removeEventListener('touchcancel', release);
    };

    const onDown = (event) => {
      if (!event.target?.classList?.contains(HIT_CLASS)) return;
      const { from: a, to: b, fromKey: keyA, toKey: keyB } = latest.current;
      const pointer = map.mouseEventToContainerPoint(pointerOf(event));
      const nearerStart = map.latLngToContainerPoint(a).distanceTo(pointer) <= map.latLngToContainerPoint(b).distanceTo(pointer);
      activeRef.current = nearerStart ? keyA : keyB;
      event.preventDefault();
      event.stopPropagation();
      document.addEventListener('mousemove', move);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('mouseup', release);
      document.addEventListener('touchend', release);
      document.addEventListener('touchcancel', release);
    };

    const touchStart = (event) => onDown(event);

    container.addEventListener('mousedown', onDown, true);
    container.addEventListener('touchstart', touchStart, { capture: true, passive: false });
    return () => {
      release();
      container.removeEventListener('mousedown', onDown, true);
      container.removeEventListener('touchstart', touchStart, { capture: true });
    };
  }, [map]);

  return (
    <>
      <Polyline
        positions={[from, to]}
        pathOptions={{ color, weight: 30, opacity: 0.01, className: HIT_CLASS }}
      />
      <Polyline
        positions={[from, to]}
        pathOptions={{ color, weight: 3, dashArray: '6 6', interactive: false }}
      />
    </>
  );
}