import { Volume2 } from 'lucide-react';

const SLIDERS = [
  { key: 'pitch', label: 'Pitch', min: 0.5, max: 1.5, step: 0.1, format: (v) => Number(v).toFixed(1) },
  { key: 'speed', label: 'Speed', min: 0.5, max: 1.5, step: 0.1, format: (v) => Number(v).toFixed(1) },
  { key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.1, format: (v) => `${Math.round(v * 100)}%` },
];

export default function VoiceControls({ caddie, voices, onChange, onTest }) {
  return (
    <section className="glass-panel space-y-4 rounded-2xl p-4">
      <h3 className="hud-label font-bold text-muted-foreground">Voice Synthesizer Controls</h3>

      <div>
        <label className="hud-label mb-1 block text-muted-foreground" htmlFor="voice-select">
          Select Audio Voice
        </label>
        <select
          id="voice-select"
          value={caddie.voiceName ?? ''}
          onChange={(event) => onChange({ voiceName: event.target.value || null })}
          className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="">System default voice</option>
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SLIDERS.map((slider) => (
          <div key={slider.key}>
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{slider.label}</span>
              <span className="font-bold text-foreground">{slider.format(caddie[slider.key])}</span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={caddie[slider.key]}
              onChange={(event) => onChange({ [slider.key]: Number(event.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onTest}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/25 active:scale-[0.99]"
      >
        <Volume2 className="h-3.5 w-3.5" />
        Test Voice Briefing
      </button>
    </section>
  );
}