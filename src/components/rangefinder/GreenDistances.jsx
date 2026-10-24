import { useGolf } from '@/lib/GolfContext';
import { haversineYards } from '@/lib/golfData';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

const GREEN_REACH_YARDS = 45;

/** The green outline nearest the pin, so front and back are the real edges. */
function greenRing(graphics, pin) {
  const greens = graphics?.green?.features ?? [];
  let best = null;
  let bestYards = GREEN_REACH_YARDS;

  greens.forEach((green) => {
    const ring = green.geometry?.coordinates?.[0];
    if (!ring || ring.length < 3) return;
    const centre = ring.reduce(
      (acc, [lng, lat]) => [acc[0] + lng / ring.length, acc[1] + lat / ring.length],
      [0, 0],
    );
    const yards = haversineYards(pin, [centre[1], centre[0]]);
    if (yards < bestYards) {
      bestYards = yards;
      best = ring;
    }
  });

  return best;
}

export default function GreenDistances({ graphics }) {
  const { coords, units, distances, pinOffsetMetres, choosePinOffset } = useGolf();
  const source = distances.origin;
  const centre = haversineYards(source, coords.pin);
  const ring = greenRing(graphics, coords.pin);
  const spans = ring ? ring.map(([lng, lat]) => haversineYards(source, [lat, lng])) : [];

  // No real green boundary means no defensible front/back measurements.
  const front = spans.length ? Math.max(0, Math.min(...spans)) : null;
  const back = spans.length ? Math.max(...spans) : null;
  const unit = distanceUnit(units);

  return (
    <div className="glass-hud grid w-full min-w-0 grid-cols-3 items-center gap-1 rounded-lg border-l-2 border-l-primary/70 p-1 text-center shadow-xl">
      <span className="col-span-3 block text-[9px] font-bold text-muted-foreground">{distances.mode === 'live' ? 'From GPS' : 'From tee'}</span>

      <div className="min-w-0">
        <span className="block text-[8px] font-bold uppercase text-muted-foreground">Back</span>
        <span className="block text-xs font-bold tabular-nums text-foreground">{back === null ? '—' : toDisplayDistance(back, units)}</span>
      </div>

      <div className="min-w-0 border-x border-border/70 px-0.5">
        <span className="block text-[8px] font-black uppercase tracking-wide text-primary">Center</span>
        <span className="block text-base font-black leading-tight tabular-nums text-foreground">
          {toDisplayDistance(centre, units)}
        </span>
        <span className="block text-[7px] font-bold uppercase text-primary/80">{unit}</span>
      </div>

      <div>
        <span className="block text-[8px] font-bold uppercase text-muted-foreground">Front</span>
        <span className="block text-xs font-bold tabular-nums text-foreground">{front === null ? '—' : toDisplayDistance(front, units)}</span>
      </div>
      <div className="col-span-3 border-t border-border/70 pt-1" aria-label="Approximate pin position">
        <span className="block text-[7px] font-semibold uppercase text-muted-foreground">Target*</span>
        <div className="mt-0.5 flex gap-px">
          {[['F', -10], ['C', 0], ['B', 10]].map(([label, delta]) => (
            <button key={label} type="button" onClick={() => choosePinOffset(delta)}
              title={label === 'F' ? 'Approx. front target' : label === 'B' ? 'Approx. back target' : 'Mapped pin'}
              aria-pressed={pinOffsetMetres === delta}
              className={`min-w-0 flex-1 rounded border px-0.5 py-1 text-[9px] font-bold ${pinOffsetMetres === delta ? 'border-primary bg-primary/25 text-primary' : 'border-border bg-muted/50 text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="sr-only">*±10 m estimate</span>
      </div>
    </div>
  );
}