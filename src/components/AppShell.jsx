import { Outlet } from 'react-router-dom';
import { Mic, Moon, Ruler, Sun } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import VoiceDock from '@/components/caddie/VoiceDock';
import { useGolf } from '@/lib/GolfContext';
import { useTheme } from '@/hooks/useTheme';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

export default function AppShell() {
  const { gpsStatus, gpsFix, gpsMode, gpsTrackingStatus, listening, toggleListening, units, setUnits, keepScreenAwake } = useGolf();
  const wakeStatus = useScreenWakeLock(keepScreenAwake);
  const { theme, toggle } = useTheme();
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
      <header className="apex-app-header glass-panel z-30 shrink-0 border-b px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/apex-launcher.webp" alt="Apex Golf AI"
              className="apex-logo-frame h-9 w-9 shrink-0 rounded-lg object-cover" />
            <h1 className="min-w-0 truncate text-[13px] font-extrabold tracking-[0.06em] text-foreground">
              APEX <span className="apex-gold">GOLF AI</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => setUnits(metric ? 'imperial' : 'metric')}
              aria-label={metric ? 'Switch to yards' : 'Switch to metres'}
              className="flex h-9 min-w-11 items-center justify-center gap-1 rounded-lg border border-border bg-muted/70 px-2 text-[11px] font-bold text-foreground">
              <Ruler className="h-3.5 w-3.5" /> {metric ? 'M' : 'YD'}
            </button>
            <button type="button" onClick={toggle}
              aria-label={theme === 'dark' ? 'Outdoor daylight mode' : 'Night mode'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/70 text-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleListening}
              aria-label="Caddie microphone"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border ${listening ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/70 text-foreground'}`}>
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-1 truncate text-[10px] font-medium leading-tight text-muted-foreground">
          {listening ? 'Voice caddie active' : gpsLabel}{keepScreenAwake ? (wakeStatus === 'active' ? ' · SCREEN AWAKE' : ' · WAKE LOCK ' + wakeStatus.toUpperCase()) : ''}
        </p>
      </header>
      <main className="relative isolate min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <VoiceDock />
      <BottomNav />
    </div>
  );
}
