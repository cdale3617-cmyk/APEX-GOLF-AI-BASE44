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
  Bookmark,
  BookmarkCheck,
  Volume2,
} from 'lucide-react';
import CoursePicker from '@/components/rangefinder/CoursePicker';
import HoleNotes from '@/components/rangefinder/HoleNotes';
import GpsShotTracker from '@/components/rangefinder/GpsShotTracker';
import DistanceHUD from '@/components/rangefinder/DistanceHUD';
import EnvModal from '@/components/rangefinder/EnvModal';
import GreenDistances from '@/components/rangefinder/GreenDistances';
import HoleBar from '@/components/rangefinder/HoleBar';
import MapLibreHoleMap from '@/components/rangefinder/MapLibreHoleMap';
import ViewControls from '@/components/rangefinder/ViewControls';
import ShotLogger from '@/components/scorecard/ShotLogger';
import { fetchCourseGraphics } from '@/lib/courseGraphics';
import { getFavoriteCourseIds, saveFavoriteCourse, removeFavoriteCourse } from '@/lib/courses';
import { useGolf } from '@/lib/GolfContext';
import { searchGolfCourses } from '@/lib/osmCourses';
import { distanceUnitSpoken, toDisplayDistance, toDisplayWind, windUnit, toDisplayTemp, tempUnit, toDisplayElev, elevUnit } from '@/lib/units';

export default function Rangefinder() {
  const {
    coords,
    units,
    gpsFix,
    gpsMode,
    playerFocusNonce,
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
    scorecard,
    briefing,
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
  const [envOpen, setEnvOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [graphics, setGraphics] = useState(null);
  const [satellite, setSatellite] = useState(true);
  const [pitchOn, setPitchOn] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(getFavoriteCourseIds);
  const [courseSaveMessage, setCourseSaveMessage] = useState('');
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
    setUiHidden(false);
    setSearchError('');
    setResults([]);
    try {
      const found = await searchGolfCourses(term);
      // Results and error messages live in the right-hand panel. Reopen the
      // 50/50 view after searching so full-screen maps cannot hide them.
      setUiHidden(false);
      if (found.length) {
        setResults(found);
        const area = found.find((result) => result.kind === 'place');
        // The Find action navigates to the searched town immediately.
        // Course results stay available below for precise hole selection.
        if (area?.center) focusCourse(area.center[0], area.center[1], term);
        if (!found.some((result) => result.kind !== 'place')) {
          setSearchError('Town located, but online map services returned no golf clubs. Try the club name or retry the search.');
        }
      } else {
        setSearchError('No location or golf course found. Try the club name or a nearby town.');
      }
    } catch (error) {
      setUiHidden(false);
      setSearchError(error?.message ?? 'Course search is unavailable right now.');
    } finally {
      setSearching(false);
    }
  };

  const saveCourse = (picked) => {
    if (!picked || picked.kind === 'place') return;
    try {
      saveFavoriteCourse(picked);
      setFavoriteIds(getFavoriteCourseIds());
      setCourseSaveMessage(picked.name + ' saved to your courses.');
    } catch (error) {
      setCourseSaveMessage(error?.message || 'Could not save this course.');
    }
  };

  const toggleSavedCourse = (picked) => {
    if (!picked || picked.kind === 'place') return;
    try {
      if (favoriteIds.includes(picked.id)) {
        setFavoriteIds(removeFavoriteCourse(picked.id));
        setCourseSaveMessage(picked.name + ' removed from saved courses.');
      } else {
        saveCourse(picked);
      }
    } catch (error) {
      setCourseSaveMessage(error?.message || 'Could not update saved courses.');
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
    setCourseSaveMessage('');
    setHudOpen(false);
  };

  return (
    <div className={`apex-course-vibrant absolute inset-0 grid h-full min-h-0 w-full min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background ${uiHidden ? 'grid-cols-1' : 'grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'}`}>
      <div className="col-span-full z-[1000] flex min-w-0 flex-col gap-1 border-b border-primary/70 bg-background p-1.5">
        <div className="flex w-full min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <HoleBar
            course={course}
            hole={hole}
            holeCount={holes.length || 18}
            holeIndex={holeIndex}
            onPrev={prevHole}
            onNext={nextHole}
            onOpenCourses={() => setCoursesOpen(true)}
          />
        </div>
        <button
          type="button"
          onClick={() => setUiHidden((hidden) => !hidden)}
          aria-label={uiHidden ? 'Restore split view' : 'Full-screen hole map'}
          aria-pressed={uiHidden}
          className="glass-hud flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 text-primary transition active:scale-95"
        >
          {uiHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        </div>
        <form
          className="flex h-11 w-full min-w-0 overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-lg focus-within:border-primary"
          role="search"
          onSubmit={(event) => { event.preventDefault(); runSearch(); }}
        >
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchError('');
              setResults([]);
            }}
            enterKeyHint="search"
            placeholder="Search golf course or town…"
            aria-label="Search golf course or town"
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex h-full w-10 shrink-0 items-center justify-center text-muted-foreground active:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={searching || !query.trim()}
            aria-label="Find golf course or town"
            className="flex h-full w-20 shrink-0 items-center justify-center gap-1 bg-primary text-primary-foreground transition active:brightness-110 disabled:opacity-60"
          >
            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="text-xs font-bold">{searching ? 'Wait' : 'Find'}</span>
          </button>
        </form>
        {(searching || results.length > 0 || searchError) && (
          <section aria-live="polite" className="max-h-[42vh] overflow-y-auto rounded-lg border-2 border-primary/60 bg-card px-2 py-2 text-foreground shadow-xl">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-primary">
                {searching ? 'SEARCHING COURSES…' : results.length ? 'COURSES FOUND' : 'COURSE SEARCH'}
              </span>
              {!searching && (
                <button type="button"
                  onClick={() => { setResults([]); setSearchError(''); }}
                  aria-label="Close course search results"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searching && (
              <p role="status" className="flex items-center gap-2 py-2 text-sm font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Looking for {query.trim()}… Please wait.
              </p>
            )}
            {!searching && results.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs">Tap a course to open its holes. Use the bookmark to save it.</p>
                {results.slice(0, 10).map((result) => (
                  <div key={result.id} className="flex items-stretch gap-1 rounded-lg border border-border/70 bg-background">
                    <button type="button" onClick={() => loadCourse(result)}
                      className="min-h-11 min-w-0 flex-1 rounded-lg px-3 py-2 text-left">
                      <p className="truncate text-sm font-bold">{result.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{result.location || 'Golf course'}</p>
                    </button>
                    {result.kind !== 'place' && (
                      <button type="button" onClick={() => toggleSavedCourse(result)}
                        aria-label={favoriteIds.includes(result.id) ? 'Remove saved ' + result.name : 'Save ' + result.name}
                        className="flex min-h-11 min-w-12 items-center justify-center rounded-lg border border-primary/40 text-primary">
                        {favoriteIds.includes(result.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!searching && searchError && (
              <div role="alert" className="mt-2 rounded-lg border border-destructive/60 bg-destructive/15 px-3 py-2">
                <p className="text-sm font-semibold text-foreground">{searchError}</p>
                <button type="button" onClick={runSearch}
                  className="mt-2 min-h-10 rounded-lg border border-primary/60 bg-primary/15 px-4 text-sm font-bold text-primary">
                  Retry search
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      <div className="relative h-full min-h-0 min-w-0 overflow-hidden">
        <MapLibreHoleMap
        key={courseId}
        coords={coords}
        hole={hole}
        focus={{ center: focusCenter, nonce: focusNonce }}
        courseCenter={course?.center}
        holeReady={Boolean(hole && !hole.estimated)}
        holePreview={Boolean(hole)}
        units={units}
        gpsFix={gpsFix}
        gpsMode={gpsMode}
        playerFocusNonce={playerFocusNonce}
        graphics={graphics}
        pitchOn={pitchOn}
        satellite={satellite}
        onMoveTarget={moveTarget}
        onPinSettled={() =>
          speak(hole?.estimated
            ? 'Pin moved on an estimated layout. Distances are not verified.'
            : `Pin moved. ${gpsMode === 'live' ? 'GPS' : 'Tee preview'} plays like ${toDisplayDistance(distances.playsLike, units)} ${distanceUnitSpoken(units)}. Take your ${distances.club.name}.`)
        }
      />

      {courseLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1050] flex justify-center">
          <div className="glass-hud flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-lg">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            Loading hole map…
          </div>
        </div>
      )}

      {courseError && !courseLoading && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-[1050] flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/15 p-2.5 text-[11px] font-semibold text-destructive shadow-xl">
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

      </div>

      {!uiHidden && (
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto border-l-2 border-primary/70 bg-background p-2 pb-4 sm:p-3">
          <div className="pointer-events-auto flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/course-lab')}
              aria-label="Open the course graphics lab"
              className="glass-hud flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border-border/80 text-muted-foreground transition hover:text-primary active:scale-95"
            >
              <Layers className="h-4 w-4" />
            </button>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {course ? (
              <button type="button" onClick={() => saveCourse(course)}
                aria-label={favoriteIds.includes(course.id) ? 'Course saved to favourites' : 'Save current course'}
                className="glass-hud flex min-h-10 min-w-0 flex-1 basis-full items-center justify-center gap-2 sm:basis-0 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition active:bg-primary/20">
                {favoriteIds.includes(course.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {favoriteIds.includes(course.id) ? 'Course Saved' : 'Save Course'}
              </button>
            ) : null}
            <button type="button" onClick={() => setCoursesOpen(true)}
              className="glass-hud flex min-h-10 min-w-0 flex-1 basis-full items-center justify-center gap-1.5 sm:basis-0 rounded-xl border border-border/80 px-2 py-2 text-xs font-bold text-foreground transition active:bg-muted">
              <Bookmark className="h-4 w-4 text-primary" /> Saved Courses ({favoriteIds.length})
            </button>
          </div>
          {courseSaveMessage && (
            <p role="status" className="pointer-events-auto rounded-lg border border-primary/30 bg-background/95 px-3 py-1.5 text-[11px] font-semibold text-primary">
              {courseSaveMessage}
            </p>
          )}


          {results.length === 0 && hole && (
            <section className="glass-hud space-y-1.5 rounded-xl border border-primary/30 p-2">
              <div className="flex min-w-0 items-center justify-between gap-1">
                <span className="text-[10px] font-black text-primary">CADDIE ADVICE</span>
                <button type="button" onClick={() => speak(briefing())}
                  aria-label="Speak Caddie advice" className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 text-primary">
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] leading-snug text-foreground">
                {hole.estimated ? 'Estimated layout. Wait for verified hole positions before relying on distances.' : distances.reason}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => navigate('/scorecard')}
                  className="min-h-10 rounded-lg border border-border bg-muted/60 px-1 text-[10px] font-bold text-foreground">
                  Score: {scorecard[holeIndex]?.score || '—'}
                </button>
                <button type="button" onClick={() => navigate('/scorecard')}
                  className="min-h-10 rounded-lg border border-border bg-muted/60 px-1 text-[10px] font-bold text-foreground">
                  Putts: {scorecard[holeIndex]?.putts ?? '—'}
                </button>
              </div>
            </section>
          )}
          {results.length === 0 && hole && <>
          <GpsShotTracker
            courseId={courseId}
            holeNumber={hole?.number}
            gpsFix={gpsFix}
            gpsMode={gpsMode}
            clubs={clubs}
            suggestedClubId={distances.club?.id}
            units={units}
            onLog={logShot}
            speak={speak}
          />
          <HoleNotes courseId={courseId} holeNumber={hole?.number} />
          </>}

          <div className="pointer-events-auto glass-hud flex flex-wrap items-center justify-between gap-1.5 rounded-xl px-2.5 py-1.5 shadow-xl">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
              <span className="flex items-center gap-1.5" title="Wind">
                <Wind className="h-3.5 w-3.5 text-primary" />
                <span className="font-bold text-foreground whitespace-nowrap">
                  {toDisplayWind(env.windSpeed, units)} {windUnit(units)} {env.windDir}
                </span>
              </span>
              <span className="flex items-center gap-1.5" title="Temperature">
                <Thermometer className="h-3.5 w-3.5 text-warm" />
                <span className="font-bold text-foreground whitespace-nowrap">{toDisplayTemp(env.temp, units)}{tempUnit(units)}</span>
              </span>
              <span className="flex items-center gap-1.5" title="Elevation delta">
                <Mountain className="h-3.5 w-3.5 text-cool" />
                <span className="font-bold text-foreground whitespace-nowrap">
                  {env.elevDelta > 0 ? '+' : ''}{toDisplayElev(env.elevDelta, units)} {elevUnit(units)}
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

          <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-2">
            {hole && !hole.estimated
              ? <GreenDistances graphics={graphics} />
              : <span className="glass-hud max-w-[165px] rounded-xl border border-warm/60 p-2 text-[10px] font-semibold leading-snug text-foreground">
                  {hole?.estimated ? 'Estimated hole layout. GPS distances disabled.' : 'Choose a mapped hole for GPS distances.'}
                </span>}
            <ViewControls
              pitchOn={pitchOn}
              satellite={satellite}
              onTogglePitch={() => setPitchOn((on) => !on)}
              onToggleSatellite={() => setSatellite((on) => !on)}
              onRecenter={() => goToHole(holeIndex)}
            />
          </div>
      {!uiHidden && hole?.estimated && (
        <div className="shrink-0 rounded-lg border border-warm/70 bg-background/95 px-3 py-2 text-center text-[11px] font-semibold text-warm">
          UNVERIFIED HOLE · Positions are estimated, not safe for shot distances
        </div>
      )}

      {!uiHidden && hole && !hole.estimated && (
        <div className="shrink-0 space-y-2">
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
                Yellow: your adjustable route. Red: direct aggressive line. Drag TEE, TARGET and PIN. Neither route is a verified safe path.
              </p>
            </>
          )}
        </div>
      )}


        </div>
      )}

      <EnvModal open={envOpen} onOpenChange={setEnvOpen} env={env} onSave={setEnv} />

      <CoursePicker
        open={coursesOpen}
        onOpenChange={setCoursesOpen}
        activeCourseId={courseId}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleSavedCourse}
        onSelect={(id) => {
          selectCourse(id);
          setCourseSaveMessage('');
          setCoursesOpen(false);
        }}
      />
    </div>
  );
}