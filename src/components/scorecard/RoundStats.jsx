import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelativeToPar } from '@/lib/golfData';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

/**
 * The score screen already has putt-entry controls. Use the old Putts summary
 * tile as an entry to real, individually logged shot history instead.
 */
export default function RoundStats({ stats, shots = [], clubs = [], units = 'metric' }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const recentShots = Array.isArray(shots) ? shots : [];
  const clubName = (shot) =>
    shot.clubName || clubs.find((club) => club.id === shot.clubId)?.name || 'Club';

  const tiles = [
    { label: 'Total', value: stats.holes ? `${stats.score} (${formatRelativeToPar(stats.diff)})` : '—', tone: 'text-foreground' },
    { label: 'Shot History', value: recentShots.length, tone: 'text-sky-400', history: true },
    { label: 'FIR %', value: stats.holes ? `${stats.firPct}%` : '—', tone: 'text-primary' },
    { label: 'GIR %', value: stats.holes ? `${stats.girPct}%` : '—', tone: 'text-amber-400' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile) =>
          tile.history ? (
            <button
              key={tile.label}
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
              aria-controls="apex-shot-history"
              aria-label={historyOpen ? 'Hide shot history' : 'Open shot history'}
              className="glass-panel rounded-xl border border-primary/40 p-2.5 text-center transition hover:bg-primary/10 active:bg-primary/15"
            >
              <span className="hud-label block leading-tight text-muted-foreground">Shot History</span>
              <span className={`mt-0.5 block text-sm font-extrabold tabular-nums ${tile.tone}`}>{tile.value}</span>
              {historyOpen
                ? <ChevronUp className="mx-auto mt-0.5 h-3 w-3 text-primary" />
                : <ChevronDown className="mx-auto mt-0.5 h-3 w-3 text-primary" />}
            </button>
          ) : (
            <div key={tile.label} className="glass-panel rounded-xl p-2.5 text-center">
              <span className="hud-label block text-muted-foreground">{tile.label}</span>
              <span className={`mt-0.5 block text-sm font-extrabold tabular-nums ${tile.tone}`}>{tile.value}</span>
            </div>
          )
        )}
      </div>

      {historyOpen && (
        <section id="apex-shot-history" className="glass-panel rounded-2xl p-3">
          <h3 className="hud-label mb-2 font-bold text-primary">Shot History</h3>
          {recentShots.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              No individual shots logged yet. Use Log on the GPS or Score screen to
              record your club and carry. Hole scores and putts are recorded separately.
            </p>
          ) : (
            <div className="max-h-60 space-y-1.5 overflow-y-auto">
              {recentShots.slice(0, 100).map((shot, index) => (
                <div
                  key={shot.id ?? index}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{clubName(shot)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {shot.holeNumber ? `Hole ${shot.holeNumber}` : 'Hole not recorded'}
                      {shot.date ? ` · ${new Date(shot.date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-primary">
                    {toDisplayDistance(shot.distance, units)} {distanceUnit(units)}
                  </span>
                </div>
              ))}
              {recentShots.length > 100 && (
                <p className="text-[10px] text-muted-foreground">
                  Showing the latest 100 of {recentShots.length} logged shots.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
