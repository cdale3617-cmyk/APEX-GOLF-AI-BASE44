import { RotateCcw, Target } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DrillCard from '@/components/drills/DrillCard';
import { DRILLS } from '@/lib/drills';
import { useDrillProgress } from '@/hooks/useDrillProgress';

const CATEGORIES = ['Putting', 'Short game'];

export default function Drills() {
  const { progress, record, reset, resetAll } = useDrillProgress();

  const entries = Object.values(progress);
  const attempts = entries.reduce((sum, entry) => sum + (entry.attempts ?? 0), 0);
  const made = entries.reduce((sum, entry) => sum + (entry.made ?? 0), 0);
  const pct = attempts ? Math.round((made / attempts) * 100) : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title="Short Game Drills" subtitle="Putting and wedge circuits you can log on the practice green">
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </PageHeader>

        <section className="glass-panel flex items-center justify-between rounded-2xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="hud-label font-bold text-muted-foreground">This session</p>
              <p className="text-sm font-bold text-foreground">
                {made} of {attempts} reps hit
              </p>
            </div>
          </div>
          <span className="text-2xl font-black tabular-nums text-primary">{pct}%</span>
        </section>

        {CATEGORIES.map((category) => (
          <section key={category} className="space-y-2">
            <h3 className="hud-label font-bold text-muted-foreground">{category}</h3>
            {DRILLS.filter((drill) => drill.category === category).map((drill) => (
              <DrillCard
                key={drill.id}
                drill={drill}
                progress={progress[drill.id]}
                onRecord={record}
                onReset={reset}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}