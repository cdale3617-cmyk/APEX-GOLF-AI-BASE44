import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

const BASE = 'flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition active:scale-95';
const TONE_ON = 'border-primary/50 bg-primary/20 text-primary';
const TONE_OFF = 'border-border bg-muted/50 text-muted-foreground hover:text-foreground';

export default function QuickShotActions({ scorecard, activeHole, onUpdate }) {
  const [selected, setSelected] = useState(activeHole ?? 1);

  // Follow the hole being played until the golfer picks another one.
  useEffect(() => {
    if (activeHole) setSelected(activeHole);
  }, [activeHole]);

  const index = selected - 1;
  const hole = scorecard[index];
  if (!hole) return null;

  const putts = hole.putts ?? 0;
  const penalties = hole.penalties ?? 0;
  const step = (delta) => setSelected((prev) => Math.min(scorecard.length, Math.max(1, prev + delta)));

  return (
    <section className="glass-panel rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="hud-label font-bold text-muted-foreground">Quick Log</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            One tap per shot event on the hole you pick.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={selected <= 1}
            aria-label="Previous hole"
            className="rounded-md p-1 text-muted-foreground transition hover:text-primary disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-1 text-[11px] font-bold tabular-nums text-foreground">Hole {hole.hole}</span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={selected >= scorecard.length}
            aria-label="Next hole"
            className="rounded-md p-1 text-muted-foreground transition hover:text-primary disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="hud-label mb-1 block font-semibold text-muted-foreground">Fairway</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onUpdate(index, { fir: true })}
              className={`${BASE} flex-1 ${hole.fir ? TONE_ON : TONE_OFF}`}
            >
              Hit
            </button>
            <button
              type="button"
              onClick={() => onUpdate(index, { fir: false })}
              className={`${BASE} flex-1 ${hole.fir ? TONE_OFF : TONE_ON}`}
            >
              Missed
            </button>
          </div>
        </div>

        <div>
          <span className="hud-label mb-1 block font-semibold text-muted-foreground">Green</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onUpdate(index, { gir: true })}
              className={`${BASE} flex-1 ${hole.gir ? TONE_ON : TONE_OFF}`}
            >
              Hit
            </button>
            <button
              type="button"
              onClick={() => onUpdate(index, { gir: false })}
              className={`${BASE} flex-1 ${hole.gir ? TONE_OFF : TONE_ON}`}
            >
              Missed
            </button>
          </div>
        </div>

        <div>
          <span className="hud-label mb-1 block font-semibold text-muted-foreground">Putts</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdate(index, { putts: Math.max(0, putts - 1) })}
              disabled={putts === 0}
              aria-label="Remove a putt"
              className={`${BASE} px-2 disabled:opacity-30`}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex-1 text-center text-xs font-bold tabular-nums text-sky-400">{putts}</span>
            <button
              type="button"
              onClick={() => onUpdate(index, { putts: putts + 1 })}
              aria-label="Add a putt"
              className={`${BASE} px-2 ${TONE_OFF}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div>
          <span className="hud-label mb-1 block font-semibold text-muted-foreground">Penalty</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdate(index, { penalties: Math.max(0, penalties - 1) })}
              disabled={penalties === 0}
              aria-label="Remove a penalty stroke"
              className={`${BASE} px-2 disabled:opacity-30`}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex-1 text-center text-xs font-bold tabular-nums text-destructive">{penalties}</span>
            <button
              type="button"
              onClick={() => onUpdate(index, { penalties: penalties + 1 })}
              aria-label="Add a penalty stroke"
              className={`${BASE} px-2 ${
                penalties ? 'border-destructive/50 bg-destructive/15 text-destructive' : TONE_OFF
              }`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-2 border-t border-border/70 pt-1.5 text-[10px] text-muted-foreground">
        Penalty strokes count toward your total score; putts feed your putting stats.
      </p>
    </section>
  );
}