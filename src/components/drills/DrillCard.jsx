import { Check, RotateCcw, X } from 'lucide-react';

export default function DrillCard({ drill, progress, onRecord, onReset }) {
  const attempts = progress?.attempts ?? 0;
  const made = progress?.made ?? 0;
  const best = progress?.best ?? 0;
  const pct = attempts ? Math.round((made / attempts) * 100) : 0;
  const complete = attempts >= drill.goal;

  return (
    <div className={`glass-panel rounded-2xl p-3 ${complete ? 'border-primary/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="hud-label rounded border border-border px-1.5 py-0.5 font-bold text-muted-foreground">
              {drill.category}
            </span>
            {best > 0 && <span className="text-[10px] text-muted-foreground">Best {best}%</span>}
          </div>
          <p className="mt-1 text-sm font-bold text-foreground">{drill.name}</p>
        </div>
        <button
          type="button"
          onClick={() => onReset(drill.id)}
          aria-label={`Reset ${drill.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{drill.setup}</p>
      <p className="mt-1 text-[11px] leading-snug text-primary/90">{drill.cue}</p>

      <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span>
          <span className="text-foreground">{made}</span> made of{' '}
          <span className="text-foreground">{attempts}</span> {drill.unit}
        </span>
        <span className="tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, (attempts / drill.goal) * 100)}%` }}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onRecord(drill.id, true)}
          className="flex items-center justify-center gap-1 rounded-lg border border-primary/40 bg-primary/15 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/25 active:scale-95"
        >
          <Check className="h-3.5 w-3.5" />
          Made
        </button>
        <button
          type="button"
          onClick={() => onRecord(drill.id, false)}
          className="flex items-center justify-center gap-1 rounded-lg border border-border bg-muted/60 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:bg-muted active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
          Missed
        </button>
      </div>
    </div>
  );
}