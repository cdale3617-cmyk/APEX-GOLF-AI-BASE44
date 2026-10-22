import { Trash2 } from 'lucide-react';
import { formatRelativeToPar } from '@/lib/golfData';

const STROKE_LABELS = ['Tee', 'Appr', 'ARG', 'Putt'];

export default function RoundCard({ round, onDelete }) {
  const { stats, strokes } = round;
  const total = strokes.reduce((sum, value) => sum + value, 0);

  const handleDelete = () => {
    if (window.confirm('Delete this saved round?')) onDelete(round.id);
  };

  const tiles = [
    { label: 'Putts', value: stats.putts },
    { label: 'FIR', value: `${stats.firPct}%` },
    { label: 'GIR', value: `${stats.girPct}%` },
    { label: 'SG', value: `${total > 0 ? '+' : ''}${total.toFixed(1)}` },
  ];

  return (
    <div className="glass-panel rounded-2xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{round.courseName}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {new Date(round.date).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            • {stats.holes} holes • {round.shots} logged shots
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-black leading-none tabular-nums text-foreground">{stats.score}</p>
            <p className="text-[10px] font-bold text-primary">{formatRelativeToPar(stats.diff)}</p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete round"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border/70 bg-muted/40 py-1.5">
            <p className="hud-label text-muted-foreground">{tile.label}</p>
            <p className="text-xs font-bold tabular-nums text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {strokes.map((value, index) => (
          <div
            key={STROKE_LABELS[index]}
            className="flex items-center justify-between rounded-lg bg-muted/30 px-1.5 py-1"
          >
            <span className="text-[9px] font-semibold text-muted-foreground">{STROKE_LABELS[index]}</span>
            <span
              className={`text-[10px] font-bold tabular-nums ${value >= 0 ? 'text-primary' : 'text-destructive'}`}
            >
              {value > 0 ? '+' : ''}
              {value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}