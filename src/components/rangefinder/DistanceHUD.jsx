import { ChevronDown, ChevronUp, Crosshair, LocateFixed, Sparkles } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, distanceUnitLong, toDisplayDistance } from '@/lib/units';

export default function DistanceHUD({ distances, onLocate, expanded = false, onToggle }) {
  const { units } = useGolf();
  const direct = toDisplayDistance(distances.direct, units);
  const playsLike = toDisplayDistance(distances.playsLike, units);
  const seg1 = toDisplayDistance(distances.seg1, units);
  const seg2 = toDisplayDistance(distances.seg2, units);
  const carry = toDisplayDistance(distances.club.carry, units);
  const shortUnit = distanceUnit(units);
  const longUnit = distanceUnitLong(units).toUpperCase();

  if (!expanded) {
    return (
      <div className="glass-hud flex min-w-0 items-center gap-1 rounded-xl border-primary/30 p-1.5 px-2 shadow-2xl">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center justify-between gap-1.5 overflow-hidden text-left">
          <span className="flex items-baseline gap-1">
            <span className="text-xl font-black leading-none tabular-nums text-primary">{playsLike}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-primary/80">plays</span>
          </span>
          <span className="h-6 w-px bg-border" />
          <span className="flex items-baseline gap-1">
            <span className="text-sm font-bold tabular-nums text-foreground">{direct}</span>
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">direct</span>
          </span>
          <span className="h-6 w-px bg-border" />
          <span className="hidden min-w-0 items-center gap-1 sm:flex">
            <span className="truncate text-xs font-extrabold text-foreground">{distances.club.name}</span>
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </span>
        </button>

        <button
          type="button"
          onClick={onLocate}
          aria-label="Locate me"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/70 text-primary transition hover:bg-muted active:scale-95"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="glass-hud rounded-2xl border-primary/30 p-3 shadow-2xl">
      <div className="grid grid-cols-3 gap-2 border-b border-border/70 pb-2.5 text-center">
        <div className="flex flex-col justify-center">
          <span className="hud-label text-muted-foreground">Direct Pin</span>
          <span className="mt-0.5 text-xl font-black tabular-nums text-foreground">{direct}</span>
          <span className="text-[9px] font-semibold tracking-wide text-muted-foreground">{longUnit}</span>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-primary/30 bg-primary/10 py-1">
          <span className="hud-label font-semibold text-primary">Plays-Like</span>
          <span className="text-2xl font-black tabular-nums text-primary drop-shadow-sm">{playsLike}</span>
          <span className="text-[9px] font-semibold tracking-wide text-primary/80">{longUnit}</span>
        </div>

        <div className="flex flex-col justify-center">
          <span className="hud-label text-muted-foreground">Layup Split</span>
          <span className="mt-0.5 text-xl font-black tabular-nums text-amber-400">
            {seg1} / {seg2}
          </span>
          <span className="text-[9px] font-semibold tracking-wide text-muted-foreground">{longUnit}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary">
            <Crosshair className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-muted-foreground">Recommended</span>
              <span className="truncate text-sm font-extrabold text-foreground">{distances.club.name}</span>
              {distances.club.carry > 0 && (
                <span className="ml-auto shrink-0 text-xs font-bold tabular-nums text-primary">
                  {carry} {shortUnit}
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
              {distances.club.samples > 0 && (
                <span className="mr-1 inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1 py-[1px] align-middle font-semibold text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                  {distances.club.samples} shot{distances.club.samples === 1 ? '' : 's'}
                </span>
              )}
              <span className="font-semibold text-primary/90">{distances.factors}</span> • {distances.reason}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Minimise distance panel"
            className="flex h-8 w-10 items-center justify-center rounded-xl border border-border bg-muted/70 text-muted-foreground transition hover:bg-muted active:scale-95"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onLocate}
            aria-label="Locate me"
            className="flex h-8 w-10 items-center justify-center rounded-xl border border-border bg-muted/70 text-primary transition hover:bg-muted active:scale-95"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}