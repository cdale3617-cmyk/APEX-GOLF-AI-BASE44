import { useEffect, useState } from 'react';

const TONES = {
  1: 'bg-primary text-primary-foreground',
  2: 'border border-primary/40 bg-primary/20 text-primary',
  3: 'border border-primary/40 bg-primary/20 text-primary',
  4: 'bg-amber-400 text-background',
};

export default function BeatFlash() {
  const [beat, setBeat] = useState(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const handler = (event) => {
      const next = event.detail?.beat ?? 0;
      setBeat(next);
      if (next) setPulse((prev) => prev + 1);
    };
    window.addEventListener('apex-tempo-beat', handler);
    return () => window.removeEventListener('apex-tempo-beat', handler);
  }, []);

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10">
      {beat ? (
        <div
          key={pulse}
          className={`beat-pop flex h-9 w-9 items-center justify-center rounded-full text-sm font-black shadow-lg ${TONES[beat]}`}
        >
          {beat}
        </div>
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/70 text-[8px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
          Tempo
        </div>
      )}
    </div>
  );
}