import { useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import GappingChart from '@/components/bag/GappingChart';
import ClubRow from '@/components/bag/ClubRow';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';
import { CLUB_CATALOG, MAX_BAG_CLUBS } from '@/lib/clubCatalog';
import { distanceUnit } from '@/lib/units';

export default function Bag() {
  const {
    clubs, updateClub, resetBag, distances, learnedClubs, units,
    autoGapEnabled, setAutoGapEnabled, gapReferenceId,
    addBagClub, removeBagClub,
  } = useGolf();

  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState('');
  const available = CLUB_CATALOG.filter((item) => !clubs.some((club) => club.id === item.id));
  const selected = available.some((item) => item.id === selectedId) ? selectedId : (available[0]?.id ?? '');
  const full = clubs.length >= MAX_BAG_CLUBS;

  const add = () => {
    if (!selected || full) return;
    const result = addBagClub(selected);
    setNotice(result.error || (result.club?.name + ' added in its correct order.'));
    if (!result.error) setSelectedId('');
  };

  const remove = (club) => {
    if (!window.confirm('Remove ' + club.name + ' from your bag? Logged shots will be kept.')) return;
    const result = removeBagClub(club.id);
    setNotice(result.error || club.name + ' removed. Other club distances are unchanged.');
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader
          title={clubs.length + '/' + MAX_BAG_CLUBS + ' Club Bag & Gapping'}
          subtitle="Choose your clubs · automatic correct order · club carry gapping"
        >
          <button type="button" onClick={() => {
            if (!window.confirm('Reset the bag to its default 14 clubs and distances?')) return;
            resetBag();
            setNotice('Bag reset to the default clubs.');
          }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[11px] font-semibold text-amber-400 transition hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </PageHeader>

        <section className="glass-panel space-y-2 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Your Clubs · Longest to Shortest</h3>
            <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              {clubs.length} / {MAX_BAG_CLUBS}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select value={selected} onChange={(event) => setSelectedId(event.target.value)}
              disabled={full || !available.length}
              aria-label="Choose a club to add"
              className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-2 text-sm font-semibold text-foreground disabled:opacity-50">
              {available.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
              {!available.length && <option value="">No more clubs</option>}
            </select>
            <button type="button" onClick={add} disabled={full || !selected}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/20 px-3 text-xs font-bold text-primary transition active:bg-primary/30 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Add Club
            </button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {full
              ? 'Your bag has 14 clubs. Use Remove on any club below, then choose its replacement here.'
              : 'Select a wood, hybrid, iron or wedge. New clubs automatically go in the right position.'}
          </p>
          {notice && <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-2 text-xs font-semibold text-primary">{notice}</p>}
        </section>

        <section className="glass-panel space-y-2 rounded-2xl p-3">
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
            <span className="text-sm font-bold text-foreground">Automatic Club Gapping</span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-primary">
              {autoGapEnabled ? 'ON' : 'OFF'}
              <input type="checkbox" checked={autoGapEnabled}
                onChange={(event) => setAutoGapEnabled(event.target.checked)}
                aria-label="Automatic club gapping"
                className="h-5 w-5 accent-primary" />
            </span>
          </label>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {autoGapEnabled
              ? 'Driver and L-Wedge carries stay at your set distances while in your bag. Enter an iron or wood carry and press Enter to re-gap the other clubs. Putter stays unchanged.'
              : 'Manual mode: each club can be adjusted separately.'}
          </p>
          {autoGapEnabled && (
            <p className="text-[11px] font-semibold text-primary">
              Gapping reference: {clubs.find((club) => club.id === gapReferenceId)?.name
                ?? (clubs.find((club) => club.id === '8i')?.name || 'Your next edited club')}
            </p>
          )}
        </section>

        <section className="glass-panel rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="hud-label font-bold text-muted-foreground">
              Distance Gapping Matrix ({distanceUnit(units)})
            </h3>
            <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {distances.club.name} called
            </span>
          </div>
          <GappingChart clubs={clubs} />
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            Chart shows your selected carries. Caddie recommendations also learn from logged shots.
          </p>
        </section>

        <section className="glass-panel rounded-2xl p-3">
          <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-2">
            <span className="hud-label font-bold text-muted-foreground">Club Spec Details</span>
            <span className="text-[10px] text-muted-foreground">Saved on this device</span>
          </div>
          <div className="space-y-2">
            {clubs.map((club, index) => (
              <ClubRow key={club.id} club={club}
                learned={learnedClubs[index]}
                onToggle={(active) => updateClub(index, { active })}
                onCarry={(carry) => updateClub(index, { carry })}
                onMiss={(miss) => updateClub(index, { miss })}
                onRemove={() => remove(club)}
              />
            ))}
            {!clubs.length && (
              <p className="py-5 text-center text-xs font-semibold text-muted-foreground">
                Your bag is empty. Select a club above and tap Add Club.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
