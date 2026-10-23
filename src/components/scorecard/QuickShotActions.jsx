import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Minus, Plus, History } from 'lucide-react';

const BASE = 'flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition active:scale-95';
const TONE_ON = 'border-primary/50 bg-primary/20 text-primary';
const TONE_OFF = 'border-border bg-muted/50 text-muted-foreground hover:text-foreground';

export default function QuickShotActions({ scorecard, activeHole, onUpdate, onComplete, autoAdvance = true }) {
  const [selected, setSelected] = useState(activeHole ?? 1);

  // Follow the hole being played until the golfer picks another one.
  useEffect(() => {
    if (activeHole) setSelected(activeHole);
  }, [activeHole]);

  const index = selected - 1;
  const hole = scorecard[index];
  if (!hole) return null;

  const penalties = hole.penalties ?? 0;
  const step = (delta) => setSelected((prev) => Math.min(scorecard.length, Math.max(1, prev + delta)));

  return (
    <section className="glass-panel rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-primary">Log a Hole</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Score and putts first, then confirm the hole.
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

      <div className="mb-3 grid grid-cols-2 gap-2">
        {[
          { key: 'score', label: 'Score', value: hole.score ?? 0 },
          { key: 'putts', label: 'Putts', value: hole.putts ?? 0 },
        ].map(({ key, label, value }) => (
          <div key={key} className="rounded-xl border border-primary/35 bg-primary/10 p-2">
            <span className="mb-1 block text-center text-xs font-extrabold text-foreground">{label}</span>
            <div className="flex items-center justify-between gap-1">
              <button type="button" onClick={() => onUpdate(index, { [key]: Math.max(0, value - 1) })}
                disabled={value === 0} aria-label={`Reduce ${label.toLowerCase()}`}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground disabled:opacity-40">
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xl font-black tabular-nums text-primary" aria-label={`${label}: ${value}`}>{value || '—'}</span>
              <button type="button" onClick={() => onUpdate(index, { [key]: value + 1 })}
                disabled={value >= (key === 'putts' ? 12 : 20)} aria-label={`Add ${label.toLowerCase()}`}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground disabled:opacity-40">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
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
          <span className="hud-label mb-1 block font-semibold text-muted-foreground">Shot History</span>
          <Link to="/shot-history" className="flex min-h-9 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-2 py-1.5 text-[11px] font-bold text-primary">
            <History className="h-4 w-4" /> View Shots
          </Link>
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

      <button type="button"
        onClick={() => onComplete?.(index)}
        disabled={!(hole.score > 0)}
        className="mt-3 w-full rounded-lg border border-primary/50 bg-primary/20 px-3 py-2.5 text-xs font-bold text-primary transition active:bg-primary/30 disabled:opacity-40"
      >
        {autoAdvance && index < scorecard.length - 1 ? 'Confirm score & next hole' : 'Confirm hole score'}
      </button>
      <p className="mt-2 border-t border-border/70 pt-1.5 text-[10px] text-muted-foreground">
        Your putts and score are saved here; the full scorecard remains below.
      </p>
    </section>
  );
}
