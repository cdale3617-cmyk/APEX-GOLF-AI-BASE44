import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, fromDisplayDistance, toDisplayDistance } from '@/lib/units';

export default function ShotLogger({
  clubs,
  shots,
  suggestedClubId,
  suggestedDistance,
  compact = false,
  onLog,
  onRemove,
  onReset,
}) {
  const { units } = useGolf();
  const unit = distanceUnit(units);
  const options = clubs.filter((club) => club.active && club.carry > 0);
  const [clubId, setClubId] = useState('');
  const [distance, setDistance] = useState('');

  const club =
    options.find((option) => option.id === clubId) ??
    options.find((option) => option.id === suggestedClubId) ??
    options[0];
  const yards = distance === '' ? suggestedDistance : fromDisplayDistance(Number(distance), units);
  const canLog = Boolean(club) && yards > 0;
  const clubName = (id) => clubs.find((entry) => entry.id === id)?.name ?? 'Club';

  const handleLog = () => {
    if (!canLog) return;
    onLog({ clubId: club.id, distance: Math.round(yards) });
    setDistance('');
  };

  const handleReset = () => {
    if (window.confirm('Clear every logged shot? Your carries go back to your stated distances.')) onReset();
  };

  if (compact) {
    return (
      <div className="mt-2">
        <div className="glass-panel flex items-center gap-1.5 rounded-xl p-1.5 shadow-xl">
          <select
            value={club?.id ?? ''}
            onChange={(event) => setClubId(event.target.value)}
            aria-label="Club"
            className="min-w-0 flex-1 rounded-lg border border-input bg-background/70 px-2 py-1.5 text-[11px] font-bold text-foreground outline-none focus:border-primary"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            inputMode="numeric"
            value={distance}
            placeholder={`${toDisplayDistance(suggestedDistance ?? club?.carry, units)}`}
            onChange={(event) => setDistance(event.target.value)}
            aria-label={`Shot distance in ${unit}`}
            className="w-[58px] rounded-lg border border-input bg-background/70 p-1.5 text-center text-[11px] font-bold tabular-nums text-primary outline-none focus:border-primary"
          />
          <span className="text-[10px] font-bold text-primary">{unit}</span>

          <button
            type="button"
            onClick={handleLog}
            disabled={!canLog}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/25 active:scale-95 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Log
          </button>
        </div>

        {shots.length > 0 && (
          <button
            type="button"
            onClick={() => onRemove(shots[0].id)}
            title="Undo last shot"
            className="mt-1 pl-1 text-[9px] font-medium text-muted-foreground transition hover:text-destructive"
          >
            Last: {clubName(shots[0].clubId)} · {toDisplayDistance(shots[0].distance, units)} {unit} · tap to undo
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="glass-panel space-y-3 rounded-2xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="hud-label font-bold text-muted-foreground">Club Distance Log</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Log how far each club actually flew. Your carries self-correct as shots add up.
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {shots.length} shots
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={club?.id ?? ''}
          onChange={(event) => setClubId(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background/70 px-2 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="numeric"
          value={distance}
          placeholder={`${toDisplayDistance(club?.carry, units)}`}
          onChange={(event) => setDistance(event.target.value)}
          aria-label={`Actual carry in ${unit}`}
          className="w-[68px] rounded-lg border border-input bg-background/70 p-2 text-center text-xs font-bold tabular-nums text-primary outline-none focus:border-primary"
        />
        <span className="text-[10px] font-bold text-primary">{unit}</span>

        <button
          type="button"
          onClick={handleLog}
          disabled={!canLog}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-2 text-[11px] font-bold text-primary transition hover:bg-primary/25 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Log
        </button>
      </div>

      {shots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/70 pt-2.5">
          {shots.slice(0, 5).map((shot) => (
            <button
              key={shot.id}
              type="button"
              onClick={() => onRemove(shot.id)}
              title="Remove this shot"
              className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
            >
              {clubName(shot.clubId)} · {toDisplayDistance(shot.distance, units)} {unit}
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          ))}
          {shots.length > 5 && (
            <span className="px-1 py-1 text-[10px] text-muted-foreground">+{shots.length - 5} more</span>
          )}
        </div>
      )}

      {shots.length > 0 && (
        <button
          type="button"
          onClick={handleReset}
          className="text-[10px] font-semibold text-muted-foreground underline-offset-2 transition hover:text-destructive hover:underline"
        >
          Clear shot log
        </button>
      )}
    </section>
  );
}
