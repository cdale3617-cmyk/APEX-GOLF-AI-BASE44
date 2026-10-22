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
  const { coords, units } = useGolf();

  const centre = haversineYards(coords.tee, coords.pin);
  const ring = greenRing(graphics, coords.pin);
  const spans = ring ? ring.map(([lng, lat]) => haversineYards(coords.tee, [lat, lng])) : [];

  const front = spans.length ? Math.max(0, Math.min(...spans)) : Math.max(0, centre - 15);
  const back = spans.length ? Math.max(...spans) : centre + 15;
  const unit = distanceUnit(units);

  return (
    <div className="glass-hud w-[86px] shrink-0 rounded-2xl border-l-2 border-l-primary/70 p-2 text-center shadow-xl">
      <span className="hud-label block font-bold text-muted-foreground">To green</span>

      <div className="mt-1">
        <span className="block text-[8px] font-bold uppercase text-muted-foreground">Back</span>
        <span className="block text-xs font-bold tabular-nums text-foreground">{toDisplayDistance(back, units)}</span>
      </div>

      <div className="my-1 border-y border-border/70 py-1">
        <span className="block text-[8px] font-black uppercase tracking-wide text-primary">Center</span>
        <span className="block text-lg font-black leading-tight tabular-nums text-foreground">
          {toDisplayDistance(centre, units)}
        </span>
        <span className="block text-[7px] font-bold uppercase text-primary/80">{unit}</span>
      </div>

      <div>
        <span className="block text-[8px] font-bold uppercase text-muted-foreground">Front</span>
        <span className="block text-xs font-bold tabular-nums text-foreground">{toDisplayDistance(front, units)}</span>
      </div>
    </div>
  );
}