import { useEffect, useState } from 'react';
import { Headphones, RefreshCw } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { canPickOutput, hasOutputs, listOutputs, routeAudio } from '@/lib/audioRoute';

export default function AudioOutput() {
  const { audioSink, setAudioSink } = useGolf();
  const [outputs, setOutputs] = useState([]);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      setOutputs(await listOutputs());
    } catch {
      setOutputs([]);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scan();
    const devices = navigator.mediaDevices;
    if (!devices?.addEventListener) return undefined;
    const onchange = () => scan();
    devices.addEventListener('devicechange', onchange);
    return () => devices.removeEventListener('devicechange', onchange);
  }, []);

  const choose = async (deviceId) => {
    setAudioSink(deviceId);
    try {
      await routeAudio(deviceId);
    } catch {
      // Android WebView often routes via the phone's Bluetooth setting instead.
    }
  };

  return (
    <section className="glass-panel space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="hud-label flex items-center gap-1.5 font-bold text-muted-foreground">
          <Headphones className="h-3.5 w-3.5 text-primary" />
          Caddie Audio Output
        </h3>
        <button
          type="button"
          onClick={scan}
          disabled={!hasOutputs() || scanning}
          className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-primary disabled:opacity-40"
        >
          <RefreshCw className={`h-3 w-3 ${scanning ? 'animate-spin' : ''}`} />
          Scan
        </button>
      </div>

      <select
        value={audioSink}
        onChange={(event) => choose(event.target.value)}
        aria-label="Caddie audio output"
        className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary"
      >
        <option value="">System default (phone speaker or connected earbuds)</option>
        {outputs.map((device, index) => (
          <option key={device.deviceId || index} value={device.deviceId}>
            {device.label || `Audio output ${index + 1}`}
          </option>
        ))}
      </select>

      <p className="text-[10px] leading-snug text-muted-foreground">
        {canPickOutput()
          ? 'Pair earbuds in S24 Bluetooth settings, then scan and select here if offered. Tap Test Caddie sound to verify the actual route.'
          : 'Pair earbuds in S24 Bluetooth settings. This Android view normally follows the phone audio route. Tap Test Caddie sound to verify before your round.'}
      </p>
    </section>
  );
}