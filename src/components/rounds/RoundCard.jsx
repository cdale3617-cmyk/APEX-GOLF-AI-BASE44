import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { formatRelativeToPar } from '@/lib/golfData';

const STROKE_LABELS = ['Tee', 'Appr', 'ARG', 'Putt'];

export default function RoundCard({ round, onDelete }) {
  const { stats, strokes } = round;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const savedHoles = Array.isArray(round.scorecard) ? round.scorecard : [];
  const savedShots = Array.isArray(round.shotDetails) ? round.shotDetails : [];
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

      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        aria-expanded={detailsOpen}
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-left text-xs font-semibold text-primary"
      >
        Hole & shot history
        {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {detailsOpen && (
        <div className="mt-2 space-y-3 text-xs text-foreground">
          <div>
            <p className="mb-1 font-bold text-muted-foreground">Hole scores</p>
            {savedHoles.length ? (
              <div className="space-y-1">
                {savedHoles.map((hole) => (
                  <div key={hole.hole} className="flex justify-between rounded-lg bg-muted/40 px-2 py-1.5">
                    <span>Hole {hole.hole} · Par {hole.par}</span>
                    <span className="font-semibold tabular-nums">
                      {hole.score + (hole.penalties ?? 0)} strokes · {hole.putts ?? 0} putts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Hole-by-hole detail was not stored in this older saved round.</p>
            )}
          </div>
          <div>
            <p className="mb-1 font-bold text-muted-foreground">Individual logged shots</p>
            {savedShots.length ? (
              <div className="space-y-1">
                {savedShots.map((shot, i) => (
                  <div key={shot.id ?? i} className="flex justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                    <span>{shot.holeNumber ? `Hole ${shot.holeNumber} · ` : ''}{shot.clubName || shot.clubId || 'Club'}</span>
                    <span className="font-semibold tabular-nums">{shot.distance} yds</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No individual shots were logged for this round. Score and putts are recorded separately.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}