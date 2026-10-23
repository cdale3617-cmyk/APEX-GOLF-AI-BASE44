import { useEffect, useState } from 'react';
import { Headphones, RefreshCw, Volume2 } from 'lucide-react';
import { useGolf } from '@/lib/GolfContext';
import { canPickOutput, hasOutputs, listOutputs, routeAudio, testAudioOutput } from '@/lib/audioRoute';

export default function AudioOutput() {
  const { audioSink, setAudioSink, speak } = useGolf();
  const [outputs, setOutputs] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');

  const scan = async () => {
    setScanning(true);
    try {
      setOutputs(await listOutputs());
      setStatus('Android Bluetooth pairing is managed in phone Settings.');
    } catch {
      setStatus('Audio outputs cannot be listed in this Android web view.');
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
    setStatus('Output selected for test tones; Android chooses the voice playback route.');
    speak('Caddie audio test.');
  };

  const test = async () => {
    try {
      await testAudioOutput(audioSink);
      setStatus('Sound test played. If silent, increase media volume and check Bluetooth in Android Settings.');
    } catch (error) {
      setStatus(error?.message || 'Sound test could not play.');
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
        <button type="button" onClick={test}
          className="flex min-h-10 items-center gap-1 rounded-lg border border-primary/50 bg-primary/15 px-2 text-xs font-bold text-primary">
          <Volume2 className="h-4 w-4" /> Test sound
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
          ? 'Pair earbuds in Android Bluetooth Settings, then Scan. Test sound confirms the selected output; the Caddie voice follows Android media routing.'
          : 'Pair earbuds in Android Bluetooth Settings. This web view cannot choose a Bluetooth device directly; sound follows Android media routing.'}
      </p>
      {status && <p role="status" className="text-xs font-semibold text-primary">{status}</p>}
    </section>
  );
}
