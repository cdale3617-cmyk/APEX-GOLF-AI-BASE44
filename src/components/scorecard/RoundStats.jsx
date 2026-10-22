import { formatRelativeToPar } from '@/lib/golfData';

export default function RoundStats({ stats }) {
  const tiles = [
    { label: 'Total', value: stats.holes ? `${stats.score} (${formatRelativeToPar(stats.diff)})` : '—', tone: 'text-foreground' },
    { label: 'Putts', value: stats.holes ? stats.putts : '—', tone: 'text-sky-400' },
    { label: 'FIR %', value: stats.holes ? `${stats.firPct}%` : '—', tone: 'text-primary' },
    { label: 'GIR %', value: stats.holes ? `${stats.girPct}%` : '—', tone: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((tile) => (
        <div key={tile.label} className="glass-panel rounded-xl p-2.5 text-center">
          <span className="hud-label block text-muted-foreground">{tile.label}</span>
          <span className={`mt-0.5 block text-sm font-extrabold tabular-nums ${tile.tone}`}>{tile.value}</span>
        </div>
      ))}
    </div>
  );
}