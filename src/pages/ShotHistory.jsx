import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';
import { toDisplayDistance, distanceUnit } from '@/lib/units';

export default function ShotHistory() {
  const { shots, rounds, learnedClubs, units, removeShot, resetShots } = useGolf();
  const [filter, setFilter] = useState('all');
  const [showSaved, setShowSaved] = useState(true);
  const clubName = (id) => learnedClubs.find((club) => club.id === id)?.name || id || 'Club';
  const saved = useMemo(() => rounds.flatMap((round) => (
    (Array.isArray(round.shotDetails) ? round.shotDetails : []).map((shot) => ({
      ...shot, course: round.courseName, roundDate: round.date, roundId: round.id,
    }))
  )), [rounds]);
  const matches = (shot) => filter === 'all' || shot.clubId === filter;
  const visibleCurrent = shots.filter(matches);
  const visibleSaved = saved.filter(matches);
  const format = (shot) => {
    const amount = toDisplayDistance(Number(shot.distance) || 0, units);
    return String(amount) + ' ' + distanceUnit(units);
  };
  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-3">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader title="Shot History" subtitle="Current shots and individual shots from saved rounds">
          <Link to="/scorecard" className="rounded-lg border border-border bg-muted/60 p-2 text-foreground" aria-label="Back to scorecard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </PageHeader>
        <section className="glass-panel rounded-2xl p-3">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">Current shot log</p>
              <p className="text-xl font-black text-foreground">{shots.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">Shots in saved rounds</p>
              <p className="text-xl font-black text-foreground">{saved.length}</p>
            </div>
          </div>
          <label className="block text-xs font-semibold text-foreground" htmlFor="history-club">Filter by club</label>
          <select id="history-club" value={filter} onChange={(event) => setFilter(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground">
            <option value="all">All clubs</option>
            {learnedClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
        </section>
        <section className="glass-panel rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Current round</h3>
            {shots.length > 0 && (
              <button type="button" onClick={() => {
                if (window.confirm('Clear the current shot log? Saved round history will remain.')) resetShots();
              }} className="flex min-h-10 items-center gap-1 rounded-lg border border-destructive/40 px-2 text-xs font-semibold text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          {visibleCurrent.length ? <div className="mt-2 space-y-2">
            {visibleCurrent.map((shot, index) => (
              <div key={shot.id || index} className="flex min-h-12 items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <History className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">{clubName(shot.clubId)} · {format(shot)} · {shot.kind === 'gps-total' ? 'GPS total' : 'Carry'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {shot.holeNumber ? 'Hole ' + shot.holeNumber + ' · ' : ''}
                    {shot.date ? new Date(shot.date).toLocaleString() : 'Current round'}
                  </p>
                </div>
                <button type="button" onClick={() => removeShot(shot.id)} aria-label="Delete shot" className="min-h-10 min-w-10 rounded-lg border border-border text-destructive">
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </div>
            ))}
          </div> : <p className="mt-2 text-xs text-muted-foreground">No matching shots yet. Log club carry from GPS or Score.</p>}
        </section>
        <section className="glass-panel rounded-2xl p-3">
          <button type="button" onClick={() => setShowSaved((value) => !value)}
            aria-expanded={showSaved} className="flex min-h-11 w-full items-center justify-between text-left text-sm font-bold text-foreground">
            Saved rounds <span className="text-xs text-primary">{showSaved ? 'Hide' : 'Show'}</span>
          </button>
          {showSaved && (visibleSaved.length ? <div className="space-y-2">
            {visibleSaved.map((shot, index) => (
              <div key={String(shot.roundId) + '-' + String(shot.id || index)} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <p className="text-xs font-bold text-foreground">{shot.clubName || clubName(shot.clubId)} · {format(shot)} · {shot.kind === 'gps-total' ? 'GPS total' : 'Carry'}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {shot.course || 'Saved course'} · {shot.holeNumber ? 'Hole ' + shot.holeNumber + ' · ' : ''}
                  {shot.roundDate ? new Date(shot.roundDate).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
          </div> : <p className="text-xs text-muted-foreground">No saved shot records match your filter. Save a scored round to keep its shot log.</p>)}
        </section>
      </div>
    </div>
  );
}
