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

export default function GreenDistances({ graphics, compact = false }) {
  const { coords, units, distances, pinOffsetMetres, choosePinOffset } = useGolf();
  const source = distances.origin;
  const centre = haversineYards(source, coords.pin);
  const ring = greenRing(graphics, coords.pin);
  const spans = ring ? ring.map(([lng, lat]) => haversineYards(source, [lat, lng])) : [];

  // No real green boundary means no defensible front/back measurements.
  const front = spans.length ? Math.max(0, Math.min(...spans)) : null;
  const back = spans.length ? Math.max(...spans) : null;
  const unit = distanceUnit(units);

  if (compact) return (
    <div className="glass-hud min-w-0 rounded-lg border border-primary/25 p-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] font-semibold text-muted-foreground">
        <span>{distances.mode === 'live' ? 'From GPS' : 'From tee'} · {unit}</span><span>Targets below: ±10 m estimate</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        {[['Front', front], ['Center', centre], ['Back', back]].map(([label, yards]) => (
          <div key={label} className="min-w-0 py-1">
            <span className="block text-[9px] font-semibold text-muted-foreground">{label}</span>
            <span className="block text-lg font-black leading-tight tabular-nums text-foreground">{yards === null ? '—' : toDisplayDistance(yards, units)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1" aria-label="Approximate pin position">
        {[['F', -10], ['C', 0], ['B', 10]].map(([label, delta]) => (
          <button key={label} type="button" onClick={() => choosePinOffset(delta)} aria-pressed={pinOffsetMetres === delta}
            aria-label={label === 'F' ? 'Approximate front target' : label === 'B' ? 'Approximate back target' : 'Mapped pin target'}
            className={`min-h-11 min-w-0 flex-1 rounded border text-[11px] font-bold ${pinOffsetMetres === delta ? 'border-primary bg-primary/20 text-primary' : 'border-border text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );

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