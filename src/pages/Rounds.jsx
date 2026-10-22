import { useState } from 'react';
import { Save, Trophy } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import HandicapCard from '@/components/rounds/HandicapCard';
import RoundCard from '@/components/rounds/RoundCard';
import { useGolf } from '@/lib/GolfContext';

export default function Rounds() {
  const { rounds, saveRound, deleteRound, stats } = useGolf();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!saveRound()) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader title="Round History" subtitle="Every finished round is stored on this device">
          <button
            type="button"
            onClick={handleSave}
            disabled={!stats.holes}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? 'Saved' : 'Save round'}
          </button>
        </PageHeader>

        <HandicapCard rounds={rounds} />

        {rounds.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">No rounds saved yet</p>
            <p className="max-w-xs text-[11px] leading-snug text-muted-foreground">
              Log your holes on the scorecard, then save the round to keep it here for comparison.
            </p>
          </div>
        ) : (
          rounds.map((round) => <RoundCard key={round.id} round={round} onDelete={deleteRound} />)
        )}
      </div>
    </div>
  );
}