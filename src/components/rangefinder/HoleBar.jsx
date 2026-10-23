import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function HoleBar({ course, hole, holeCount = 18, holeIndex = 0, onPrev, onNext, onOpenCourses }) {
  const { units } = useGolf();
  return (
    <div className="glass-hud flex min-w-0 items-center gap-1 rounded-xl px-1 py-0.5 shadow-xl">
      <button type="button" onClick={onPrev} disabled={!course}
        aria-label="Previous hole"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpenCourses}
        aria-label="Select a different golf course"
        className="min-w-0 flex-1 overflow-hidden px-1 text-left">
        <span className="block truncate text-[10px] font-bold leading-tight text-foreground">{course?.name || 'Select course'}</span>
        <span className="block truncate whitespace-nowrap text-[10px] font-semibold leading-tight text-primary">
          {course ? (
            <>
              {`H${hole?.number ?? holeIndex + 1}/${holeCount}`}{hole ? ` · P${hole.par}` : ' · Loading'}
              {hole ? hole.estimated ? ' · Estimated' : ` · ${toDisplayDistance(hole.yards, units)} ${distanceUnit(units)}` : ''}
            </>
          ) : 'Search above to select a course'}
        </span>
      </button>
      <button type="button" onClick={onNext} disabled={!course}
        aria-label="Next hole"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
