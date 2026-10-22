import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function HoleBar({ course, hole, holeCount = 18, onPrev, onNext, onOpenCourses }) {
  const { units } = useGolf();
  return (
    <div className="glass-hud flex min-w-0 items-center gap-1 rounded-xl px-1 py-1 shadow-xl">
      <button type="button" onClick={onPrev} disabled={!hole}
        aria-label="Previous hole"
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpenCourses}
        aria-label="Select a different golf course"
        className="min-w-0 flex-1 overflow-hidden px-1 text-left">
        <span className="block truncate text-[11px] font-bold text-foreground">{course?.name || 'Select course'}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] font-semibold text-primary">
          <Flag className="h-3 w-3 shrink-0" />
          {hole ? `Hole ${hole.number}/${holeCount} · Par ${hole.par}` : 'Choose hole'}
          {hole && <span className="truncate text-muted-foreground">
            {hole.estimated ? '· Estimated layout' : `· ${toDisplayDistance(hole.yards, units)} ${distanceUnit(units)}`}
          </span>}
        </span>
      </button>
      <button type="button" onClick={onNext} disabled={!hole}
        aria-label="Next hole"
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
