import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function HoleBar({ course, hole, holeCount = 18, onPrev, onNext, onOpenCourses, compact = false }) {
  const { units } = useGolf();
  return (
    <nav aria-label="Hole navigation" className="glass-hud flex min-w-0 items-center gap-1 rounded-lg p-1">
      {!compact && <button type="button" onClick={onPrev} disabled={!hole} aria-label="Previous hole"
        className="flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" /><span className="text-[9px] font-bold">Prev</span>
      </button>}
      <button type="button" onClick={onOpenCourses} aria-label="Select a different golf course"
        className="min-w-0 flex-1 overflow-hidden px-1 text-left">
        <span className="block truncate text-[11px] font-bold text-foreground">{course?.name || 'Select course'}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-primary">
          <Flag className="h-3 w-3 shrink-0" /> {hole ? `Hole ${hole.number}/${holeCount} · Par ${hole.par}` : 'Loading holes…'}
        </span>
        {hole && <span className="block truncate text-[9px] text-muted-foreground">
          {hole.estimated ? 'Estimated layout' : `${toDisplayDistance(hole.yards, units)} ${distanceUnit(units)}`}
        </span>}
      </button>
      {!compact && <button type="button" onClick={onNext} disabled={!hole} aria-label="Next hole"
        className="flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/70 text-primary disabled:opacity-30">
        <ChevronRight className="h-4 w-4" /><span className="text-[9px] font-bold">Next</span>
      </button>}
    </nav>
  );
}
