import { Sparkles } from 'lucide-react';
import { MISS_PROFILES } from '@/lib/golfData';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, fromDisplayDistance, toDisplayDistance } from '@/lib/units';

export default function ClubRow({ club, learned, onToggle, onCarry, onMiss }) {
  const { units } = useGolf();
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="flex w-28 shrink-0 items-center gap-2">
          <input
            type="checkbox"
            checked={club.active}
            onChange={() => onToggle(!club.active)}
            className="h-4 w-4 shrink-0 rounded border-border accent-primary"
          />
          <span className={`truncate text-xs font-bold ${club.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
            {club.name}
          </span>
        </label>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            value={toDisplayDistance(club.carry, units)}
            onChange={(event) => onCarry(fromDisplayDistance(event.target.value, units))}
            className="w-16 rounded-lg border border-input bg-background/70 p-1.5 text-center text-xs font-bold tabular-nums text-primary outline-none focus:border-primary"
          />
          <span className="text-[10px] text-muted-foreground">{distanceUnit(units)}</span>
        </div>

        <select
          value={club.miss}
          onChange={(event) => onMiss(event.target.value)}
          className="rounded-lg border border-input bg-background/70 p-1.5 text-[11px] text-muted-foreground outline-none focus:border-primary"
        >
          {MISS_PROFILES.map((profile) => (
            <option key={profile.value} value={profile.value}>
              {profile.label}
            </option>
          ))}
        </select>
      </div>

      {learned?.samples > 0 && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 border-t border-primary/20 pt-1.5 text-[10px] font-semibold text-primary">
          <Sparkles className="h-3 w-3 shrink-0" />
          Caddie plays {toDisplayDistance(learned.carry, units)} {distanceUnit(units)}
          <span className={learned.delta === 0 ? 'text-muted-foreground' : 'text-foreground'}>
            ({learned.delta > 0 ? '+' : ''}
            {toDisplayDistance(learned.delta, units)})
          </span>
          <span className="text-muted-foreground">
            · recent avg {toDisplayDistance(learned.average, units)} from {learned.samples} shot
            {learned.samples === 1 ? '' : 's'}
          </span>
        </p>
      )}
    </div>
  );
}