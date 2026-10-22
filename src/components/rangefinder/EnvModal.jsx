import { useEffect, useState } from 'react';
import { CloudSun, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { WIND_DIRECTIONS } from '@/lib/golfData';

const FIELD_CLASS =
  'w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-xs text-foreground outline-none transition focus:border-primary';

export default function EnvModal({ open, onOpenChange, env, onSave }) {
  const [draft, setDraft] = useState(env);
  const [locating, setLocating] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    if (open) setDraft(env);
  }, [open, env]);

  useEffect(() => {
    if (!open) setWeatherError('');
  }, [open]);

  const fetchLiveWeather = () => {
    if (!navigator.geolocation) {
      setWeatherError('This device cannot share a location.');
      return;
    }
    setLocating(true);
    setWeatherError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await base44.functions.invoke('getLiveWeather', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          const weather = response?.data;
          if (!weather || weather.error) throw new Error(weather?.error);
          setDraft((prev) => ({
            ...prev,
            temp: weather.temp,
            windSpeed: weather.windSpeed,
            windDir: weather.windDir,
          }));
        } catch {
          setWeatherError('Live weather is unavailable right now.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setWeatherError('Location permission is needed for live weather.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const update = (key) => (event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = () => {
    onSave({
      windSpeed: Number(draft.windSpeed) || 0,
      windDir: draft.windDir,
      temp: Number(draft.temp) || 70,
      elevDelta: Number(draft.elevDelta) || 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Environmental Conditions</DialogTitle>
          <DialogDescription className="text-[11px]">
            These factors feed the plays-like yardage and club call.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={fetchLiveWeather}
          disabled={locating}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudSun className="h-3.5 w-3.5" />}
          {locating ? 'Reading the sky…' : 'Use live weather here'}
        </button>
        {weatherError && <p className="-mt-1 text-[10px] font-semibold text-destructive">{weatherError}</p>}

        <div className="space-y-3">
          <div>
            <label className="hud-label mb-1 block text-muted-foreground" htmlFor="wind-speed">
              Wind Speed (mph)
            </label>
            <Input
              id="wind-speed"
              type="number"
              inputMode="decimal"
              value={draft.windSpeed}
              onChange={update('windSpeed')}
              className="border-input bg-background/70 text-xs"
            />
          </div>

          <div>
            <label className="hud-label mb-1 block text-muted-foreground" htmlFor="wind-dir">
              Wind Direction
            </label>
            <select id="wind-dir" value={draft.windDir} onChange={update('windDir')} className={FIELD_CLASS}>
              {WIND_DIRECTIONS.map((dir) => (
                <option key={dir} value={dir}>
                  {dir}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="hud-label mb-1 block text-muted-foreground" htmlFor="temp">
              Air Temperature (°F)
            </label>
            <Input
              id="temp"
              type="number"
              inputMode="decimal"
              value={draft.temp}
              onChange={update('temp')}
              className="border-input bg-background/70 text-xs"
            />
          </div>

          <div>
            <label className="hud-label mb-1 block text-muted-foreground" htmlFor="elev">
              Elevation Delta (ft vs tee)
            </label>
            <Input
              id="elev"
              type="number"
              inputMode="decimal"
              value={draft.elevDelta}
              onChange={update('elevDelta')}
              className="border-input bg-background/70 text-xs"
            />
          </div>
        </div>

        <Button onClick={submit} className="w-full rounded-xl text-xs font-bold">
          Update Plays-Like Conditions
        </Button>
      </DialogContent>
    </Dialog>
  );
}