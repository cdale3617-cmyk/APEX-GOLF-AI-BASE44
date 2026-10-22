import { Mic } from 'lucide-react';
import AudioOutput from '@/components/caddie/AudioOutput';
import CommandCheatsheet from '@/components/caddie/CommandCheatsheet';
import PersonalitySelector from '@/components/caddie/PersonalitySelector';
import VoiceControls from '@/components/caddie/VoiceControls';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';

export default function Caddie() {
  const { caddie, updateCaddie, voices, briefing, speak, lastHeard, listening, toggleListening } = useGolf();

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title="AI Tour Caddie Suite" subtitle="Voice personality, speech engine and command triggers">
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              listening
                ? 'neon-glow border-primary/60 bg-primary/20 text-primary'
                : 'border-border bg-muted/60 text-muted-foreground hover:text-primary'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {listening ? 'Listening…' : 'Talk'}
          </button>
        </PageHeader>

        <section className="glass-panel space-y-3 rounded-2xl p-4">
          <h3 className="hud-label font-bold text-muted-foreground">Caddie Personality & Style</h3>
          <PersonalitySelector value={caddie.personality} onChange={(personality) => updateCaddie({ personality })} />
        </section>

        <VoiceControls
          caddie={caddie}
          voices={voices}
          onChange={(patch) => updateCaddie(patch)}
          onTest={() => speak(briefing())}
        />

        <AudioOutput />

        <CommandCheatsheet lastHeard={lastHeard} />
      </div>
    </div>
  );
}