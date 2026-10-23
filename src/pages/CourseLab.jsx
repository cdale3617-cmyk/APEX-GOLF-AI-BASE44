import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers, Loader2, Satellite, TriangleAlert } from 'lucide-react';
import MapLibreCourseMap from '@/components/courselab/MapLibreCourseMap';
import { fetchCourseGraphics } from '@/lib/courseGraphics';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

const LEGEND = [
  { label: 'Fairway', className: 'bg-[#2f8040]' },
  { label: 'Green', className: 'bg-[#5ac96d]' },
  { label: 'Bunker', className: 'bg-[#e9dcae]' },
  { label: 'Water', className: 'bg-[#2a7ba8]' },
];

export default function CourseLab() {
  const { course, courseId, hole, coords, units } = useGolf();
  const [graphics, setGraphics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTurf, setShowTurf] = useState(true);

  useEffect(() => {
    if (!course?.center) {
      setLoading(false);
      return undefined;
    }
    let live = true;
    setLoading(true);
    setError('');
    setGraphics(null);

    fetchCourseGraphics(course)
      .then((drawn) => {
        if (live) setGraphics(drawn);
      })
      .catch((cause) => {
        if (live) setError(cause?.message ?? 'Course graphics are unavailable right now.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [course]);

  const center = course?.center ?? coords.tee;

  return (
    <div className="absolute inset-0">
      <MapLibreCourseMap
        key={courseId}
        center={center}
        graphics={graphics}
        tee={coords.tee}
        pin={coords.pin}
        zoom={16}
        showTurf={showTurf}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <div className="pointer-events-auto glass-hud flex items-center gap-2 rounded-xl px-2.5 py-2 shadow-xl">
          <Link
            to="/"
            aria-label="Back to rangefinder"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-bold text-foreground">{course?.name ?? 'Course graphics lab'}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              Hole {hole?.number ?? 1} · Par {hole?.par ?? 4} · {toDisplayDistance(hole?.yards ?? 0, units)} {distanceUnit(units)} · MapLibre engine
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTurf((on) => !on)}
            className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition active:scale-95 ${
              showTurf
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border bg-muted/70 text-muted-foreground'
            }`}
          >
            {showTurf ? <Layers className="h-3 w-3" /> : <Satellite className="h-3 w-3" />}
            {showTurf ? 'Turf' : 'Satellite'}
          </button>
        </div>

        <div className="pointer-events-auto glass-hud flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-xl">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>

        {loading && (
          <span className="glass-hud flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-lg">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            Drawing the course…
          </span>
        )}

        {error && !loading && (
          <span className="flex w-fit items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/15 px-2.5 py-1.5 text-[10px] font-semibold text-destructive">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
