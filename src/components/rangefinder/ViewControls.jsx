import { Box, Crosshair, Satellite } from 'lucide-react';

const buttonClass = 'glass-hud flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground shadow-lg transition hover:text-primary active:scale-95';
const activeClass = 'glass-hud flex h-8 w-8 items-center justify-center rounded-xl border-primary/50 bg-primary/15 text-primary shadow-lg transition active:scale-95';

export default function ViewControls({ pitchOn, satellite, onTogglePitch, onToggleSatellite, onRecenter }) {
  return (
    <div className="flex shrink-0 flex-row flex-wrap gap-1">
      <button
        type="button"
        onClick={onTogglePitch}
        aria-label={pitchOn ? 'Switch to flat view' : 'Switch to 3D view'}
        className={pitchOn ? activeClass : buttonClass}
      >
        <Box className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleSatellite}
        aria-label={satellite ? 'Switch to map view' : 'Switch to satellite view'}
        className={satellite ? activeClass : buttonClass}
      >
        <Satellite className="h-4 w-4" />
      </button>
      <button type="button" onClick={onRecenter} aria-label="Recentre on the hole" className={buttonClass}>
        <Crosshair className="h-4 w-4" />
      </button>
    </div>
  );
}