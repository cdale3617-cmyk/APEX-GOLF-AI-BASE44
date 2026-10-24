import { Gauge } from 'lucide-react';
import { formatHandicap, handicapIndex } from '@/lib/handicap';

export default function HandicapCard({ rounds }) {
  const result = handicapIndex(rounds);

  const tiles = [
    { label: 'Rounds counted', value: `${result.counted}/20` },
    { label: 'Best diff', value: result.bestRound === null ? '—' : result.bestRound.toFixed(1) },
    { label: 'To post', value: result.needed > 0 ? `${result.needed} more` : 'Live' },
  ];

  return (
    <section className="glass-panel rounded-2xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            <h3 className="hud-label font-bold text-muted-foreground">Handicap Estimate</h3>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {result.index === null
              ? `Post ${result.needed} more ${result.needed === 1 ? 'round' : 'rounds'} of 9 holes or more for an estimate.`
              : `Best ${result.selected} of ${result.counted} qualifying rounds, scaled to 18 holes.`}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">Unofficial estimate; excludes course rating and slope.</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black leading-none tabular-nums text-primary">
            {formatHandicap(result.index)}
          </p>
          <p className="hud-label mt-1 text-muted-foreground">Estimate</p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border/70 bg-muted/40 py-1.5">
            <p className="hud-label text-muted-foreground">{tile.label}</p>
            <p className="text-xs font-bold tabular-nums text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}