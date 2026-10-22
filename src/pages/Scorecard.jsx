import { useState } from 'react';
import { FileDown, RotateCcw, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RoundStats from '@/components/scorecard/RoundStats';
import ScorecardTable from '@/components/scorecard/ScorecardTable';
import QuickShotActions from '@/components/scorecard/QuickShotActions';
import ShareRoundButton from '@/components/scorecard/ShareRoundButton';
import ShotLogger from '@/components/scorecard/ShotLogger';
import StrokesGainedChart from '@/components/scorecard/StrokesGainedChart';
import { useGolf } from '@/lib/GolfContext';
import { exportScorecardCsv } from '@/lib/golfData';

export default function Scorecard() {
  const {
    scorecard,
    updateHole,
    resetScorecard,
    saveRound,
    stats,
    strokes,
    activeHoleNumber,
    learnedClubs,
    units,
    shots,
    logShot,
    removeShot,
    resetShots,
    distances,
  } = useGolf();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!saveRound()) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    if (window.confirm('Reset the current scorecard? Every logged hole will be cleared.')) resetScorecard();
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title="Scorecard & Strokes Gained" subtitle="Track 18 holes against a scratch baseline">
          <button
            type="button"
            onClick={handleSave}
            disabled={!stats.holes}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? 'Saved' : 'Save'}
          </button>
          <ShareRoundButton />
          <button
            type="button"
            onClick={() => exportScorecardCsv(scorecard)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
          >
            <FileDown className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/15 px-2.5 py-1.5 text-[11px] font-semibold text-destructive transition hover:bg-destructive/25"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </PageHeader>

        <RoundStats stats={stats} shots={shots} clubs={learnedClubs} units={units} />

        <section className="glass-panel rounded-2xl p-3">
          <h3 className="hud-label mb-2 font-bold text-muted-foreground">Strokes Gained Analytics</h3>
          <StrokesGainedChart strokes={strokes} hasRound={stats.holes > 0} />
        </section>

        <section className="glass-panel rounded-2xl p-3">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="hud-label font-bold text-muted-foreground">Shot Log · Carries Self-Correct</h3>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Log the carry each shot actually flew and the caddie re-learns that club's number.
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {shots.length} shots
            </span>
          </div>
          <ShotLogger
            compact
            clubs={learnedClubs}
            shots={shots}
            suggestedClubId={distances.club?.id}
            suggestedDistance={distances.direct}
            onLog={logShot}
            onRemove={removeShot}
            onReset={resetShots}
          />
        </section>

        <QuickShotActions scorecard={scorecard} activeHole={activeHoleNumber} onUpdate={updateHole} />

        <ScorecardTable scorecard={scorecard} activeHole={activeHoleNumber} onUpdate={updateHole} />
      </div>
    </div>
  );
}