import { RotateCcw } from 'lucide-react';
import GappingChart from '@/components/bag/GappingChart';
import ClubRow from '@/components/bag/ClubRow';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit } from '@/lib/units';

export default function Bag() {
  const { clubs, updateClub, resetBag, distances, learnedClubs, units, autoGapEnabled, setAutoGapEnabled, gapReferenceId } = useGolf();

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader
          title="14-Club Bag & Gapping"
          subtitle="Your club distances · automatic gapping · shot-learned caddie recommendations"
        >
          <button
            type="button"
            onClick={resetBag}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[11px] font-semibold text-amber-400 transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </PageHeader>

        <section className="glass-panel space-y-2 rounded-2xl p-3">
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
            <span className="text-sm font-bold text-foreground">Automatic Club Gapping</span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-primary">
              {autoGapEnabled ? 'ON' : 'OFF'}
              <input type="checkbox" checked={autoGapEnabled} onChange={(event) => setAutoGapEnabled(event.target.checked)}
                aria-label="Automatic club gapping"
                className="h-5 w-5 accent-primary" />
            </span>
          </label>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {autoGapEnabled
              ? 'Driver and L-Wedge stay at the distances you set. Enter a carry for any iron or wood, then press Enter or tap away: the clubs between them adjust automatically. The putter is unaffected.'
              : 'Manual mode: each club can be adjusted separately.'}
          </p>
          {autoGapEnabled && (
            <p className="text-[11px] font-semibold text-primary">
              Gapping reference: {clubs.find((club) => club.id === gapReferenceId)?.name ?? '8-Iron'} · example: set 8-Iron to 135 m
            </p>
          )}
        </section>

        <section className="glass-panel rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="hud-label font-bold text-muted-foreground">Distance Gapping Matrix ({distanceUnit(units)})</h3>
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {distances.club.name} called
            </span>
          </div>
          <GappingChart clubs={clubs} />
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">Chart shows your set/gapped carries. Caddie recommendations can also learn from logged shots.</p>
        </section>

        <section className="glass-panel rounded-2xl p-3">
          <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-2">
            <span className="hud-label font-bold text-muted-foreground">Club Spec Details</span>
            <span className="text-[10px] text-muted-foreground">Saved automatically on this device</span>
          </div>

          <div className="space-y-2">
            {clubs.map((club, index) => (
              <ClubRow
                key={club.id}
                club={club}
                learned={learnedClubs[index]}
                onToggle={(active) => updateClub(index, { active })}
                onCarry={(carry) => updateClub(index, { carry })}
                onMiss={(miss) => updateClub(index, { miss })}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}