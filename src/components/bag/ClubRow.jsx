import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MISS_PROFILES } from '@/lib/golfData';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, fromDisplayDistance, toDisplayDistance } from '@/lib/units';

export default function ClubRow({ club, learned, onToggle, onCarry, onMiss }) {
  const { units, autoGapEnabled, gapReferenceId } = useGolf();
  const [carryDraft, setCarryDraft] = useState(() => String(toDisplayDistance(club.carry, units)));
  const [carryError, setCarryError] = useState('');

  // Keep text editable while typing. Recalculate adjacent clubs only once the
  // user commits the field by leaving it or pressing Enter.
  useEffect(() => {
    setCarryDraft(String(toDisplayDistance(club.carry, units)));
    setCarryError('');
  }, [club.carry, units]);

  const saveCarry = () => {
    const text = carryDraft.trim();
    const value = Number(text);
    if (!text || !Number.isFinite(value) || value < 0 || (value === 0 && club.id !== 'pt')) {
      setCarryError('Enter a positive carry.');
      return;
    }
    const yards = fromDisplayDistance(value, units);
    const result = onCarry(yards);
    if (result?.error) {
      setCarryError(result.error);
      return;
    }
    setCarryError('');
    setCarryDraft(String(toDisplayDistance(yards, units)));
  };

  const isEndpoint = club.id === 'dr' || club.id === 'lw';
  const isReference = autoGapEnabled && gapReferenceId === club.id;
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="flex w-28 shrink-0 items-center gap-2">
          <input type="checkbox" checked={club.active} onChange={() => onToggle(!club.active)}
            className="h-4 w-4 shrink-0 rounded border-border accent-primary" />
          <span className={'truncate text-xs font-bold ' + (club.active ? 'text-foreground' : 'text-muted-foreground line-through')}>
            {club.name}
          </span>
        </label>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={club.id === 'pt' ? 0 : 1}
            max="500"
            step="1"
            value={carryDraft}
            aria-label={club.name + ' carry in ' + distanceUnit(units)}
            aria-invalid={Boolean(carryError)}
            onChange={(event) => { setCarryDraft(event.target.value); setCarryError(''); }}
            onBlur={saveCarry}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setCarryDraft(String(toDisplayDistance(club.carry, units)));
                setCarryError('');
                event.currentTarget.blur();
              }
            }}
            className="w-16 rounded-lg border border-input bg-background/70 p-1.5 text-center text-xs font-bold tabular-nums text-primary outline-none focus:border-primary"
          />
          <span className="text-[10px] text-muted-foreground">{distanceUnit(units)}</span>
        </div>

        <select value={club.miss} onChange={(event) => onMiss(event.target.value)}
          className="rounded-lg border border-input bg-background/70 p-1.5 text-[11px] text-muted-foreground outline-none focus:border-primary">
          {MISS_PROFILES.map((profile) => (
            <option key={profile.value} value={profile.value}>{profile.label}</option>
          ))}
        </select>
      </div>

      {carryError && (
        <p role="alert" className="mt-1.5 text-[11px] font-semibold text-destructive">{carryError}</p>
      )}
      {autoGapEnabled && (isEndpoint || isReference) && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {isEndpoint ? 'Fixed gapping endpoint · set your own carry' : 'Current gapping reference'}
        </p>
      )}

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
