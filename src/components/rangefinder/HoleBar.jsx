import { ChevronLeft, ChevronRight, Flag, Layers } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function HoleBar({ course, hole, holeCount = 18, onPrev, onNext, onOpenCourses }) {
  const { units } = useGolf();
  return (
    <div className="pointer-events-auto glass-hud flex items-center gap-1 rounded-xl p-1.5 shadow-xl">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hole}
        aria-label="Previous hole"
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition active:scale-95 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button type="button" onClick={onOpenCourses} className="min-w-0 flex-1 px-1 text-left">
        <div className="flex items-center gap-1.5">
          <Flag className="h-3 w-3 shrink-0 text-primary" />
          <span className="hud-label font-bold text-primary">
            {hole ? `Hole ${hole.number} / ${holeCount}` : 'Manual location'}
          </span>
          {hole && <span className="hud-label text-muted-foreground">Par {hole.par}</span>}
          {hole?.estimated && <span className="hud-label text-warm">Est.</span>}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="truncate text-sm font-extrabold leading-tight text-foreground">
            {course?.name ?? 'Custom pin'}
          </span>
          {hole && (
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-muted-foreground">
              {toDisplayDistance(hole.yards, units)} {distanceUnit(units)}
            </span>
          )}
          <Layers className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
        </div>
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!hole}
        aria-label="Next hole"
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition active:scale-95 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}