import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import CameraPoseAnalyzer from '@/components/swing/CameraPoseAnalyzer';
import SwingVideoLibrary from '@/components/swing/SwingVideoLibrary';
import TempoMetronome from '@/components/swing/TempoMetronome';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';

export default function Swing() {
  const { bpm, setBpm } = useGolf();

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader
          title="Biomechanics & Tour Tempo"
          subtitle="Live pose tracking from your camera and 3:1 rhythm training"
        >
          <Link
            to="/drills"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
          >
            <Target className="h-3.5 w-3.5" />
            Drills
          </Link>
        </PageHeader>

        <CameraPoseAnalyzer />

        <TempoMetronome bpm={bpm} onBpmChange={setBpm} />

        <SwingVideoLibrary />
      </div>
    </div>
  );
}