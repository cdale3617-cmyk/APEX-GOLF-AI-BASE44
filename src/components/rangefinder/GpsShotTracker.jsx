import { useEffect, useState } from 'react';
import { Crosshair, Footprints } from 'lucide-react';
import { MAX_FIX_AGE_MS, isCoordinate, metresBetween } from '@/lib/gpsTracking';
import { toDisplayDistance, distanceUnit, distanceUnitSpoken } from '@/lib/units';

const ACCURACY_LIMIT = 25; // metres, stricter than the map preview gate

export default function GpsShotTracker({
  courseId, holeNumber, gpsFix, gpsMode, clubs, suggestedClubId, units, onLog, speak,
}) {
  const [clubId, setClubId] = useState('');
  const [start, setStart] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => { setStart(null); setStatus(''); }, [courseId, holeNumber]);

  const options = clubs.filter((club) => club.active && club.carry > 0);
  const chosenClub = options.find((club) => club.id === clubId) ||
    options.find((club) => club.id === suggestedClubId) || options[0];

  const validFix = gpsMode === 'live' &&
    isCoordinate(gpsFix?.coords) &&
    Number.isFinite(gpsFix?.timestamp) &&
    Date.now() - gpsFix.timestamp <= MAX_FIX_AGE_MS &&
    Date.now() >= gpsFix.timestamp - 5000 &&
    Number(gpsFix?.accuracy) <= ACCURACY_LIMIT;

  const handleTrack = () => {
    if (!validFix || !chosenClub || !courseId || !holeNumber) {
      setStatus('Wait for accurate on-course GPS (within 25 m).');
      return;
    }
    if (!start) {
      setStart({
        coords: [...gpsFix.coords],
        accuracy: gpsFix.accuracy,
        courseId, holeNumber, clubId: chosenClub.id,
      });
      setStatus('Shot started. Walk to the ball, then mark landed.');
      speak?.('GPS shot started. Mark landed when you reach the ball.');
      return;
    }
    if (start.courseId !== courseId || start.holeNumber !== holeNumber) {
      setStart(null);
      setStatus('Hole changed. Start this shot again.');
      return;
    }
    const metres = metresBetween(start.coords, gpsFix.coords);
    if (!Number.isFinite(metres) || metres < 3 || metres > 500) {
      setStatus('GPS total outside the 3–500 metre range. Check your location.');
      return;
    }
    const yards = Math.round(metres / 0.9144);
    onLog({
      clubId: start.clubId,
      distance: yards,
      kind: 'gps-total',
      startCoords: start.coords,
      endCoords: [...gpsFix.coords],
      gpsAccuracy: Math.max(start.accuracy, gpsFix.accuracy),
    });
    setStart(null);
    const figure = toDisplayDistance(yards, units);
    setStatus('GPS total ' + figure + ' ' + distanceUnit(units) + ' logged to Shot History.');
    speak?.('GPS total shot distance ' + figure + ' ' + distanceUnitSpoken(units) + ' saved.');
  };

  return (
    <section className="glass-hud min-w-0 space-y-1.5 rounded-xl border border-border/70 p-2" aria-label="GPS shot tracking">
      <div className="flex items-center gap-1 text-[10px] font-bold text-foreground">
        <Crosshair className="h-3.5 w-3.5 text-primary" /> GPS shot tracking
      </div>
      <div className="flex min-w-0 gap-1">
        <select value={chosenClub?.id || ''} onChange={(e) => setClubId(e.target.value)}
          disabled={Boolean(start)} aria-label="Club used for GPS shot"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-1 text-[10px] font-bold text-foreground">
          {options.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}
        </select>
        <button type="button" onClick={handleTrack} disabled={!validFix || !chosenClub}
          className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-primary/50 bg-primary/15 px-2 text-[10px] font-bold text-primary disabled:opacity-40">
          <Footprints className="h-3.5 w-3.5" /> {start ? 'Mark Landed' : 'Track Shot'}
        </button>
      </div>
      <p role="status" className="text-[10px] leading-snug text-muted-foreground">
        {status || (validFix ? 'GPS start-to-ball total, not carry distance.' : 'Accurate live GPS needed. Manual shot log remains available.')}
      </p>
      {start && <button type="button" onClick={() => { setStart(null); setStatus('Shot tracking cancelled.'); }}
        className="text-[10px] font-semibold text-destructive underline">Cancel shot</button>}
    </section>
  );
}
