import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const BEATS = [1, 2, 3, 4];

export default function TempoMetronome({ bpm, onBpmChange }) {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!playing) {
      clearInterval(timerRef.current);
      window.dispatchEvent(new CustomEvent('apex-tempo-beat', { detail: { beat: 0 } }));
      return undefined;
    }

    if (!audioRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioRef.current = new AudioCtx();
    }
    const audio = audioRef.current;
    audio.resume?.();

    const intervalMs = (60 / bpm) * 1000;
    let current = 1;

    const click = (frequency) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.9, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.09);
    };

    const tick = () => {
      click(current === 4 ? 1200 : current === 1 ? 800 : 600);
      setBeat(current);
      window.dispatchEvent(new CustomEvent('apex-tempo-beat', { detail: { beat: current } }));
      current = current === 4 ? 1 : current + 1;
    };

    tick();
    timerRef.current = setInterval(tick, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [playing, bpm]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const backswingBeats = Math.round((bpm / 76) * 21);
  const downswingBeats = Math.max(1, Math.round(backswingBeats / 3));

  return (
    <section className="glass-panel space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="hud-label font-bold text-muted-foreground">3:1 Tour Tempo Metronome</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">PGA Tour backswing-to-downswing rhythm ratio</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((prev) => !prev)}
          aria-label={playing ? 'Stop metronome' : 'Start metronome'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
            playing
              ? 'bg-amber-500 text-background shadow-amber-500/25'
              : 'bg-primary text-primary-foreground shadow-primary/25'
          }`}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Beats Per Minute</span>
          <span className="font-bold tabular-nums text-primary">
            {backswingBeats} : {downswingBeats} ({bpm} BPM)
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="110"
          value={bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        {BEATS.map((value) => (
          <div
            key={value}
            className={`h-3 flex-1 rounded-full transition-colors duration-100 ${
              beat === value ? (value === 4 ? 'bg-amber-400' : 'bg-primary') : 'bg-muted'
            } ${value === 4 ? 'max-w-6' : ''}`}
          />
        ))}
      </div>
    </section>
  );
}