import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';
import { allCourses, courseSummary } from '@/lib/courses';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function CoursePicker({ open, onOpenChange, activeCourseId, onSelect }) {
  const courses = allCourses();
  const { units } = useGolf();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">Choose a course</DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
          {courses.map((course) => {
            const summary = courseSummary(course.id);
            const active = course.id === activeCourseId;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => onSelect(course.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                  active
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/70 bg-muted/30 hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-foreground">{course.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                    {summary ? `Par ${summary.par}` : 'Tap to map'}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{course.location}</span>
                  </span>
                  {summary ? (
                    <span className="shrink-0 font-semibold tabular-nums text-primary">
                      {toDisplayDistance(summary.yards, units)} {distanceUnit(units)}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] leading-snug text-muted-foreground">
          Hole layouts come from OpenStreetMap and are saved on this device, so the markers sit on
          the real tees and greens and load instantly once a course is cached.
        </p>
      </DialogContent>
    </Dialog>
  );
}