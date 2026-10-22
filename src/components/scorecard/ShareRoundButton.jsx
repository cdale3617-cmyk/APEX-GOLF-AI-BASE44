import { useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { handicapIndex } from '@/lib/handicap';
import { shareRoundCard } from '@/lib/roundCard';

export default function ShareRoundButton() {
  const { course, stats, strokes, rounds } = useGolf();
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    setBusy(true);
    try {
      await shareRoundCard({
        courseName: course?.name ?? 'My round',
        stats,
        strokes,
        handicap: handicapIndex(rounds).index,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={!stats.holes || busy}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
      Card
    </button>
  );
}