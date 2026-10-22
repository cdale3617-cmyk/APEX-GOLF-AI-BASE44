import { Circle, Square } from 'lucide-react';

export default function RecordButton({ recording, elapsed, onStart, onStop }) {
  const seconds = Math.floor(elapsed);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <button
      type="button"
      onClick={recording ? onStop : onStart}
      aria-label={recording ? 'Stop recording' : 'Record swing'}
      className={`absolute bottom-2 right-2 z-10 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold shadow-lg backdrop-blur transition active:scale-95 ${
        recording
          ? 'border-destructive/60 bg-destructive text-destructive-foreground'
          : 'border-border bg-background/80 text-foreground hover:text-primary'
      }`}
    >
      {recording ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Circle className="h-3.5 w-3.5 fill-destructive text-destructive" />
      )}
      {recording ? label : 'Record'}
    </button>
  );
}