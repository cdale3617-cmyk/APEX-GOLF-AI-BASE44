import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Search,
  SlidersHorizontal,
  Thermometer,
  TriangleAlert,
  Wind,
  X,
  Mountain,
} from 'lucide-react';
import CoursePicker from '@/components/rangefinder/CoursePicker';
import DistanceHUD from '@/components/rangefinder/DistanceHUD';
import EnvModal from '@/components/rangefinder/EnvModal';
import GreenDistances from '@/components/rangefinder/GreenDistances';
import HoleBar from '@/components/rangefinder/HoleBar';
import MapLibreHoleMap from '@/components/rangefinder/MapLibreHoleMap';
import ViewControls from '@/components/rangefinder/ViewControls';
import ShotLogger from '@/components/scorecard/ShotLogger';
import { fetchCourseGraphics } from '@/lib/courseGraphics';
import { useGolf } from '@/lib/GolfContext';
import { searchGolfCourses } from '@/lib/osmCourses';

export default function Rangefinder() {
  const {
    coords,
    units,
    course,
    courseId,
    courseLoading,
    courseError,
    holes,
    hole,
    holeIndex,
    goToHole,
    selectCourse,
    nextHole,
    prevHole,
    distances,
    env,
    setEnv,
    focusCenter,
    focusNonce,
    locate,
    focusCourse,
    moveTarget,
    speak,
    clubs,
    shots,
    logShot,
    removeShot,
    resetShots,
  } = useGolf();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [graphics, setGraphics] = useState(null);
  const [satellite, setSatellite] = useState(true);
  const [pitchOn, setPitchOn] = useState(true);
  const navigate = useNavigate();

  // Fairway, green, bunker and water shapes for the course being played.
  useEffect(() => {
    if (!course?.center) return undefined;
    let live = true;
    setGraphics(null);
    fetchCourseGraphics(course)
      .then((drawn) => {
        if (live) setGraphics(drawn);
      })
      .catch(() => {
        if (live) setGraphics(null);
      });
    return () => {
      live = false;
    };
  }, [course]);

  const runSearch = async () => {
    const term = query.trim();
    if (!term || searching) return;
    setSearching(true);
    setSearchError('');
    setResults([]);
    try {
      const found = await searchGolfCourses(term);
      if (found.length) {
        setResults(found);
        const area = found.find((result) => result.kind === 'place');
        // The Find action navigates to the searched town immediately.
        // Course results stay available below for precise hole selection.
        if (area?.center) focusCourse(area.center[0], area.center[1], term);
      } else {
        setSearchError('No location or golf course found. Try a nearby town.');
      }
    } catch (error) {
      setSearchError(error?.message ?? 'Course search is unavailable right now.');
    } finally {
      setSearching(false);
    }
  };

  const loadCourse = (picked) => {
    if (picked.kind === 'place') {
      focusCourse(picked.center[0], picked.center[1], picked.name.replace(/^View /, '').replace(/ area$/, ''));
    } else {
      selectCourse(picked);
    }
    setResults([]);
    setSearchError('');
    setSearchOpen(false);
    setHudOpen(false);
  };

  return (
    <div className="absolute inset-0">
      <MapLibreHoleMap
        key={courseId}
        coords={coords}
        focus={{ center: focusCenter, nonce: focusNonce }}
        courseCenter={course?.center}
        holeReady={Boolean(hole)}
        units={units}
        graphics={graphics}
        pitchOn={pitchOn}
        satellite={satellite}
        onMoveTarget={moveTarget}
        onPinSettled={() =>
          speak(`Pin moved. Plays like ${distances.playsLike} yards. Take your ${distances.club.name}.`)
        }
      />

      {courseLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-[110px] z-[1050] flex justify-center">
          <div className="glass-hud flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-lg">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            Loading hole map…
          </div>
        </div>
      )}

      {courseError && !courseLoading && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-24 z-[1050] flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/15 p-2.5 text-[11px] font-semibold text-destructive shadow-xl">
          <span className="flex-1 leading-snug">{courseError}</span>
          {courseId && (
            <button
              type="button"
              onClick={() => selectCourse(courseId)}
              className="shrink-0 rounded-lg border border-destructive/50 px-2 py-1 text-[10px] font-bold transition hover:bg-destructive/20"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {uiHidden && (
        <button
          type="button"
          onClick={() => setUiHidden(false)}
          aria-label="Show map controls"
          className="glass-hud absolute right-3 top-1/2 z-[1100] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-primary shadow-xl transition hover:bg-muted/70 active:scale-95"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      {!uiHidden && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <HoleBar
                course={course}
                hole={hole}
                holeCount={holes.length || 18}
                onPrev={prevHole}
                onNext={nextHole}
                onOpenCourses={() => setCoursesOpen(true)}
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? 'Hide search' : 'Search a course'}
              className={`flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 ${
                searchOpen
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'glass-hud border-border/80 text-muted-foreground'
              }`}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/course-lab')}
              aria-label="Open the course graphics lab"
              className="glass-hud flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border-border/80 text-muted-foreground transition hover:text-primary active:scale-95"
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setUiHidden(true)}
              aria-label="Hide panels to see the course"
              className="glass-hud flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border-border/80 text-muted-foreground transition hover:text-primary active:scale-95"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>

          {searchOpen && (
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && runSearch()}
                  placeholder="Search golf course or city…"
                  className="h-11 w-full rounded-xl border border-border/80 bg-card/75 pl-9 pr-9 text-xs text-foreground shadow-xl outline-none backdrop-blur-md transition placeholder:text-muted-foreground focus:border-primary"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={runSearch}
                disabled={searching}
                className="flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-95 disabled:opacity-60"
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Find
              </button>
            </div>
          )}

          {results.length > 0 && (
            <div className="pointer-events-auto glass-hud max-h-[42vh] overflow-y-auto rounded-xl p-1.5 shadow-xl">
              {results.slice(0, 10).map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => loadCourse(result)}
                  className="block w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-muted/60 active:scale-[0.99]"
                >
                  <p className="truncate text-xs font-bold text-foreground">{result.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {result.location || 'Golf course'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <p className="pointer-events-auto rounded-lg border border-destructive/40 bg-destructive/15 px-2.5 py-1.5 text-[10px] font-semibold text-destructive">
              {searchError}
            </p>
          )}

          <div className="pointer-events-auto glass-hud flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-1.5 shadow-xl">
            <div className="flex min-w-0 items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1.5" title="Wind">
                <Wind className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold text-foreground whitespace-nowrap">
                  {env.windSpeed} mph {env.windDir}
                </span>
              </span>
              <span className="flex items-center gap-1.5" title="Temperature">
                <Thermometer className="h-3.5 w-3.5 text-warm" />
                <span className="font-bold text-foreground whitespace-nowrap">{env.temp}°F</span>
              </span>
              <span className="flex items-center gap-1.5" title="Elevation delta">
                <Mountain className="h-3.5 w-3.5 text-cool" />
                <span className="font-bold text-foreground whitespace-nowrap">
                  {env.elevDelta > 0 ? '+' : ''}{env.elevDelta} ft
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnvOpen(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/70 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-muted"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Edit
            </button>
          </div>

          <div className="pointer-events-auto flex items-start justify-between gap-2">
            {hole ? <GreenDistances graphics={graphics} /> : <span className="glass-hud max-w-[160px] rounded-xl p-2 text-[10px] font-semibold text-foreground">Choose a mapped hole for GPS distances</span>}
            <ViewControls
              pitchOn={pitchOn}
              satellite={satellite}
              onTogglePitch={() => setPitchOn((on) => !on)}
              onToggleSatellite={() => setSatellite((on) => !on)}
              onRecenter={() => goToHole(holeIndex)}
            />
          </div>
        </div>
      )}

      {!uiHidden && hole && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] p-2">
          <DistanceHUD
            distances={distances}
            onLocate={locate}
            expanded={hudOpen}
            onToggle={() => setHudOpen((open) => !open)}
          />
          {hudOpen && (
            <>
              <ShotLogger
                compact
                clubs={clubs}
                shots={shots}
                suggestedClubId={distances.club?.id}
                suggestedDistance={distances.playsLike}
                onLog={logShot}
                onRemove={removeShot}
                onReset={resetShots}
              />
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
                <TriangleAlert className="h-3 w-3" />
                Drag the TEE, TARGET and PIN markers to set your shot plan.
              </p>
            </>
          )}
        </div>
      )}

      <EnvModal open={envOpen} onOpenChange={setEnvOpen} env={env} onSave={setEnv} />

      <CoursePicker
        open={coursesOpen}
        onOpenChange={setCoursesOpen}
        activeCourseId={courseId}
        onSelect={(id) => {
          selectCourse(id);
          setCoursesOpen(false);
        }}
      />
    </div>
  );
}