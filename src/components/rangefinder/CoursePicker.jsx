import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bookmark, BookmarkCheck, MapPin } from 'lucide-react';
import { allCourses, courseSummary } from '@/lib/courses';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function CoursePicker({ open, onOpenChange, activeCourseId, onSelect, favoriteIds = [], onToggleFavorite }) {
  const saved = new Set(favoriteIds);
  const courses = allCourses().sort((a, b) => Number(saved.has(b.id)) - Number(saved.has(a.id)));
  const savedCount = courses.filter((course) => saved.has(course.id)).length;
  const { units } = useGolf();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">Your Courses</DialogTitle>
        </DialogHeader>

        <p className="text-[11px] leading-snug text-muted-foreground">{savedCount ? `${savedCount} saved course${savedCount === 1 ? '' : 's'} at the top of your list.` : 'Search for a course, then tap Save Course to keep it here.'}</p>
        <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
          {!courses.length && (
            <p className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center text-sm text-muted-foreground">
              No courses added yet. Close this list and use the search box to find your course.
            </p>
          )}
          {courses.map((course) => {
            const summary = courseSummary(course.id);
            const active = course.id === activeCourseId;
            return (
              <div key={course.id} className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => onSelect(course.id)}
                className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                  active
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/70 bg-muted/30 hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-foreground">{saved.has(course.id) ? '★ ' : ''}{course.name}</span>
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
              <button type="button" onClick={() => onToggleFavorite?.(course)}
                aria-label={saved.has(course.id) ? 'Remove ' + course.name + ' from saved courses' : 'Save ' + course.name}
                title={saved.has(course.id) ? 'Remove from Saved Courses' : 'Save Course'}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/70 bg-muted/30 text-primary active:bg-primary/15">
                {saved.has(course.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] leading-snug text-muted-foreground">
          Saved Courses keeps course names and locations on this device. Verified hole layouts are
          cached separately when available; satellite imagery and uncached holes may need internet.
        </p>
      </DialogContent>
    </Dialog>
  );
}