import { Outlet } from 'react-router-dom';
import { Mic, Moon, Ruler, Sun, Volume2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import VoiceDock from '@/components/caddie/VoiceDock';
import { useGolf } from '@/lib/GolfContext';
import { useTheme } from '@/hooks/useTheme';

export default function AppShell() {
  const { gpsStatus, listening, toggleListening, briefing, speak, units, setUnits } = useGolf();
  const { theme, toggle } = useTheme();
  const metric = units === 'metric';

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="apex-app-header glass-panel z-30 flex shrink-0 items-center justify-between border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="apex-logo-frame h-10 w-10 shrink-0 overflow-hidden rounded-xl">
            <img src="/apex-launcher.webp" alt="Apex Golf AI" className="h-full w-full object-cover" />
          </div>
          <div className="leading-none">
            <h1 className="apex-brand-name flex items-center gap-1.5 text-sm text-foreground">
              APEX <span className="apex-gold">GOLF</span>
              <span className="rounded-md border border-warm/50 bg-warm/10 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-warm">
                AI TOUR
              </span>
            </h1>
            <p className="mt-1 text-[10px] font-medium tracking-tight text-muted-foreground">{gpsStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnits(metric ? 'imperial' : 'metric')}
            aria-label={metric ? 'Switch to yards and Fahrenheit' : 'Switch to metres and Celsius'}
            className={`flex h-9 items-center gap-1 rounded-full border px-2.5 text-[10px] font-bold tracking-wide transition active:scale-95 ${
              metric
                ? 'border-primary/50 bg-primary/20 text-primary'
                : 'border-border bg-muted/70 text-muted-foreground hover:text-primary'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            {metric ? 'M' : 'YDS'}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to daylight mode' : 'Switch to night mode'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/70 text-muted-foreground transition hover:text-primary active:scale-95"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleListening}
            aria-label="Hands-free voice commands"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-95 ${
              listening
                ? 'neon-glow border-primary/60 bg-primary/20 text-primary'
                : 'border-border bg-muted/70 text-muted-foreground hover:text-primary'
            }`}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => speak(briefing())}
            aria-label="Speak caddie briefing"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary transition hover:bg-primary/25 active:scale-95"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="relative isolate min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <VoiceDock />

      <BottomNav />
    </div>
  );
}