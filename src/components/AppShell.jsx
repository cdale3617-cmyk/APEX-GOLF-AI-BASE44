import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Mic, Moon, Ruler, Sun, Volume2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import VoiceDock from '@/components/caddie/VoiceDock';
import AudioOutput from '@/components/caddie/AudioOutput';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGolf } from '@/lib/GolfContext';
import { useTheme } from '@/hooks/useTheme';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

export default function AppShell() {
  const { gpsStatus, gpsFix, gpsMode, gpsTrackingStatus, listening, toggleListening, units, setUnits, keepScreenAwake, speak, briefing } = useGolf();
  const wakeStatus = useScreenWakeLock(keepScreenAwake);
  const [audioOpen, setAudioOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const metric = units === 'metric';
  const gpsLabel = gpsMode === 'unverified'
    ? 'UNVERIFIED HOLE · Map for orientation only'
    : gpsMode === 'live'
      ? `GPS LIVE · ±${Math.round(gpsFix?.accuracy ?? 0)} m accuracy`
      : gpsTrackingStatus === 'denied'
        ? 'LOCATION BLOCKED · Tee preview'
        : gpsTrackingStatus === 'unsupported'
          ? 'GPS UNAVAILABLE · Tee preview'
          : gpsTrackingStatus === 'weak'
            ? 'WEAK GPS SIGNAL · Tee preview'
            : gpsTrackingStatus === 'locating' || gpsTrackingStatus === 'starting'
              ? 'LOCATING GPS · Tee preview'
              : gpsTrackingStatus === 'tracking'
                ? 'OFF COURSE · Tee preview'
                : `TEE PREVIEW · ${gpsStatus}`;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="apex-app-header glass-panel z-30 shrink-0 border-b px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Link to="/" aria-label="Return to Apex Home" className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <img src="/apex-launcher.webp" alt=""
              className="apex-logo-frame h-7 w-7 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 truncate text-[11px] font-extrabold tracking-[0.06em] text-foreground">
              APEX <span className="apex-gold">GOLF AI</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setUnits(metric ? 'imperial' : 'metric')}
              aria-label={metric ? 'Switch to yards' : 'Switch to metres'}
              className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border border-border bg-muted/70 px-2 text-[11px] font-bold text-foreground">
              <Ruler className="h-3.5 w-3.5" /> {metric ? 'M' : 'YD'}
            </button>
            <button type="button" onClick={toggle}
              aria-label={theme === 'dark' ? 'Outdoor daylight mode' : 'Night mode'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleListening}
              aria-label="Caddie microphone"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border ${listening ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/70 text-foreground'}`}>
              <Mic className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setAudioOpen(true)}
              aria-label="Caddie speaker and earbuds"
              title="Caddie speaker and earbuds"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground transition hover:text-primary active:scale-95">
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {pathname !== '/' && <p className="mt-0.5 truncate text-[9px] font-medium leading-tight text-muted-foreground">
          {listening ? 'Voice caddie active' : gpsLabel}{keepScreenAwake ? (wakeStatus === 'active' ? ' · SCREEN AWAKE' : ' · WAKE LOCK ' + wakeStatus.toUpperCase()) : ''}
        </p>}
      </header>
      <main className="relative isolate min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <VoiceDock />
      <BottomNav />
      <Dialog open={audioOpen} onOpenChange={setAudioOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm">Speaker & earbuds</DialogTitle>
            <DialogDescription className="text-xs">Choose or test your Caddie audio output.</DialogDescription>
          </DialogHeader>
          <AudioOutput />
          <button type="button" onClick={() => speak(briefing())}
            className="min-h-11 rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-bold text-primary">Test Caddie sound</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
