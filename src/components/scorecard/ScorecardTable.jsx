import { useEffect, useRef } from 'react';

export default function ScorecardTable({ scorecard, activeHole, onUpdate }) {
  const activeRowRef = useRef(null);

  // Follow the hole being played on the map.
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeHole]);

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Hole</th>
              <th className="px-3 py-2 font-semibold">Par</th>
              <th className="px-3 py-2 font-semibold">Score</th>
              <th className="px-3 py-2 font-semibold">Putts</th>
              <th className="px-3 py-2 font-semibold">FIR</th>
              <th className="px-3 py-2 font-semibold">GIR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {scorecard.map((hole, index) => (
              <tr
                key={hole.hole}
                ref={hole.hole === activeHole ? activeRowRef : undefined}
                className={`transition ${
                  hole.hole === activeHole
                    ? 'border-l-2 border-primary bg-primary/10'
                    : 'hover:bg-muted/25'
                }`}
              >
                <td className="px-3 py-1.5 font-bold text-foreground">
                  #{hole.hole}
                  {hole.hole === activeHole && (
                    <span className="ml-1.5 rounded bg-primary/20 px-1 py-[1px] align-middle text-[9px] font-bold uppercase tracking-wide text-primary">
                      Playing
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{hole.par}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={hole.score || ''}
                      placeholder="–"
                      onChange={(event) => onUpdate(index, { score: Number(event.target.value) || 0 })}
                      className="w-12 rounded-lg border border-input bg-background/70 p-1 text-center text-xs font-bold tabular-nums text-primary outline-none focus:border-primary"
                    />
                    {hole.penalties > 0 && (
                      <span
                        title={`${hole.penalties} penalty stroke${hole.penalties === 1 ? '' : 's'}`}
                        className="rounded bg-destructive/15 px-1 py-0.5 text-[9px] font-bold tabular-nums text-destructive"
                      >
                        +{hole.penalties}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={hole.putts || ''}
                    placeholder="–"
                    onChange={(event) => onUpdate(index, { putts: Number(event.target.value) || 0 })}
                    className="w-12 rounded-lg border border-input bg-background/70 p-1 text-center text-xs font-bold tabular-nums text-sky-400 outline-none focus:border-primary"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdate(index, { fir: !hole.fir })}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                      hole.fir
                        ? 'border border-primary/40 bg-primary/20 text-primary'
                        : 'border border-border bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {hole.fir ? 'YES' : 'NO'}
                  </button>
                </td>
                <td className="px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdate(index, { gir: !hole.gir })}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                      hole.gir
                        ? 'border border-amber-400/40 bg-amber-400/20 text-amber-400'
                        : 'border border-border bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {hole.gir ? 'YES' : 'NO'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}