import { PERSONALITIES } from '@/lib/golfData';

export default function PersonalitySelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Object.entries(PERSONALITIES).map(([key, personality]) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition ${
              active
                ? 'border-primary/60 bg-primary/15 text-foreground'
                : 'border-border/70 bg-muted/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-foreground/80'}`}>{personality.name}</span>
            <span className="mt-1 text-[10px] leading-tight text-muted-foreground">{personality.tone}</span>
          </button>
        );
      })}
    </div>
  );
}