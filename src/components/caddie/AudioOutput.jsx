import { useEffect, useState } from 'react';
import { Headphones, RefreshCw } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { canPickOutput, hasOutputs, listOutputs, routeAudio } from '@/lib/audioRoute';

export default function AudioOutput() {
  const { audioSink, setAudioSink, speak } = useGolf();
  const [outputs, setOutputs] = useState([]);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      setOutputs(await listOutputs());
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const devices = navigator.mediaDevices;
    if (!devices?.addEventListener) return undefined;
    const onchange = () => scan();
    devices.addEventListener('devicechange', onchange);
    return () => devices.removeEventListener('devicechange', onchange);
  }, []);

  const choose = async (deviceId) => {
    setAudioSink(deviceId);
    await routeAudio(deviceId).catch(() => null);
    speak(
      deviceId
        ? 'Caddie audio is on your earbuds. I will keep the call in your ear for the whole round.'
        : 'Caddie audio is back on the phone speaker.',
    );
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
          ? 'Pair your earbuds in Bluetooth first, tap Scan, then pick them here. The caddie keeps the audio channel open so calls stay in your ear mid-round.'
          : 'This browser follows your phone’s audio route, so pair your earbuds in Bluetooth and the caddie comes through them automatically. The app keeps an audio channel open so the call never drops to the speaker mid-round.'}
      </p>
    </section>
  );
}