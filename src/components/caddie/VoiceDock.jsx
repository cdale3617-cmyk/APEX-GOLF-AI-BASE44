import { Check, Mic, X } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { describeScorePatch } from '@/lib/voiceEngine';

export default function VoiceDock() {
  const { listening, lastHeard, scoreDraft, commitScoreDraft, clearScoreDraft } = useGolf();

  if (!listening && !scoreDraft) return null;

  return (
    <div className="z-30 shrink-0 border-t border-border bg-card/95 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            listening ? 'neon-glow border-primary/60 bg-primary/20 text-primary' : 'border-border bg-muted/60 text-muted-foreground'
          }`}
        >
          <Mic className="h-3 w-3" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] leading-tight text-muted-foreground">
          {lastHeard ? (
            <>
              Heard <span className="font-semibold text-foreground">“{lastHeard}”</span>
            </>
          ) : (
            <>Say “next hole”, or “made a five with two putts”</>
          )}
        </p>
        {!listening && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Paused</span>}
      </div>

      {scoreDraft && (
        <div className="mx-auto mt-1.5 flex w-full max-w-3xl items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
            Hole {scoreDraft.hole + 1}: {describeScorePatch(scoreDraft)}
          </span>
          <button
            type="button"
            onClick={commitScoreDraft}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/50 bg-primary/20 px-2 py-1 text-[11px] font-bold text-primary transition active:scale-95"
          >
            <Check className="h-3 w-3" />
            Save
          </button>
          <button
            type="button"
            onClick={clearScoreDraft}
            aria-label="Discard draft"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition active:scale-95"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}