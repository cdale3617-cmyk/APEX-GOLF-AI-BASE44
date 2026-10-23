import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bluetooth, HeartPulse, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { BleClient } from '@capacitor-community/bluetooth-le';

const KEY = 'apex_biometric_log_v1';
const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';
const inputClass = 'min-h-12 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground';
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }

export default function Biometrics() {
  const [heart, setHeart] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState(load);
  const [status, setStatus] = useState('');
  const [connected, setConnected] = useState(false);
  const deviceRef = useRef(null);
  const valueRef = useRef(null);

  const save = (heartValue = heart, oxygenValue = oxygen) => {
    const bpm = Number(heartValue); const spo2 = Number(oxygenValue);
    const hasHeart = String(heartValue).trim() !== '';
    const hasOxygen = String(oxygenValue).trim() !== '';
    if ((!hasHeart && !hasOxygen) || (hasHeart && !(bpm>=30 && bpm<=230)) || (hasOxygen && !(spo2>=70 && spo2<=100))) {
      setStatus('Enter a heart rate of 30–230 bpm and/or oxygen saturation of 70–100%.'); return;
    }
    const next = [{ id: String(Date.now()), date: new Date().toISOString(), heart: hasHeart ? bpm : null, oxygen: hasOxygen ? spo2 : null, notes }, ...entries].slice(0,100);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setEntries(next); setStatus('Reading saved on this device.'); }
    catch { setStatus('Cannot save readings on this device.'); }
  };
  const remove = (id) => {
    const next = entries.filter((entry) => entry.id !== id);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setEntries(next); } catch { setStatus('Storage unavailable.'); }
  };
  const disconnect = async () => {
    if (deviceRef.current?.native) {
      const { deviceId } = deviceRef.current;
      await BleClient.stopNotifications(deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT).catch(() => null);
      await BleClient.disconnect(deviceId).catch(() => null);
    } else {
      try { deviceRef.current?.gatt?.disconnect(); } catch { /* already closed */ }
    }
    valueRef.current = null; deviceRef.current = null; setConnected(false);
    setStatus('Heart-rate sensor disconnected.');
  };
  useEffect(() => () => {
    if (deviceRef.current?.native) BleClient.disconnect(deviceRef.current.deviceId).catch(() => null);
    else { try { deviceRef.current?.gatt?.disconnect(); } catch { /* noop */ } }
  }, []);
  const connectHeartSensor = async () => {
    if (window.Capacitor?.isNativePlatform?.()) {
      try {
        setStatus('Scanning for a compatible Bluetooth heart-rate sensor…');
        await BleClient.initialize();
        const device = await BleClient.requestDevice({ services: [HEART_RATE_SERVICE] });
        await BleClient.connect(device.deviceId, () => {
          setConnected(false);
          setStatus('Heart-rate sensor disconnected.');
          deviceRef.current = null;
        });
        deviceRef.current = { native: true, deviceId: device.deviceId };
        await BleClient.startNotifications(device.deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, (value) => {
          const flags = value.getUint8(0);
          const bpm = flags & 1 ? value.getUint16(1, true) : value.getUint8(1);
          if (bpm >= 30 && bpm <= 230) setHeart(String(bpm));
        });
        setConnected(true);
        setStatus(`Connected to ${device.name || 'heart-rate sensor'}. Tap Save reading to keep a measurement.`);
      } catch (error) {
        if (deviceRef.current?.native) await BleClient.disconnect(deviceRef.current.deviceId).catch(() => null);
        deviceRef.current = null;
        setStatus(error?.message || 'Bluetooth connection failed. Confirm the sensor is advertising heart-rate data.');
        setConnected(false);
      }
      return;
    }
    if (!navigator.bluetooth?.requestDevice) {
      setStatus('Web Bluetooth is unavailable in this Android web view. You can log readings manually.'); return;
    }
    try {
      setStatus('Choose a Bluetooth Heart Rate Profile monitor.');
      const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      await characteristic.startNotifications();
      deviceRef.current = device;
      valueRef.current = characteristic;
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const bpm = flags & 1 ? value.getUint16(1, true) : value.getUint8(1);
        if (bpm >= 30 && bpm <= 230) setHeart(String(bpm));
      });
      device.addEventListener('gattserverdisconnected', () => { setConnected(false); setStatus('Heart-rate sensor disconnected.'); });
      setConnected(true); setStatus('Heart-rate sensor connected. Tap Save Reading to keep a measurement.');
    } catch (error) {
      setStatus(error?.message || 'Bluetooth connection failed. You can still enter readings manually.');
      setConnected(false);
    }
  };
  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-3">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader title="Biometrics" subtitle="Heart rate and SpO₂ log">
          <Link to="/more" className="rounded-lg border border-border bg-muted/60 p-2 text-foreground" aria-label="Back to More"><ArrowLeft className="h-4 w-4" /></Link>
        </PageHeader>
        <section className="glass-panel space-y-3 rounded-2xl p-3">
          <div className="flex items-center gap-2 text-primary"><HeartPulse className="h-5 w-5" /><h3 className="text-sm font-bold">Add a reading</h3></div>
          <p className="text-xs text-muted-foreground">Manual readings work offline. Connect a compatible Bluetooth Low Energy Heart Rate Profile sensor with the button below. Galaxy Watch / Health Connect history sync requires a separate watch integration.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-foreground">Heart rate (bpm)
              <input className={inputClass} type="number" inputMode="numeric" min="30" max="230" value={heart} onChange={(e) => setHeart(e.target.value)} placeholder="e.g. 75" />
            </label>
            <label className="text-xs font-semibold text-foreground">SpO₂ (%)
              <input className={inputClass} type="number" inputMode="numeric" min="70" max="100" value={oxygen} onChange={(e) => setOxygen(e.target.value)} placeholder="e.g. 98" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-foreground">Notes (optional)
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Before / after round" maxLength={120} />
          </label>
          <button type="button" onClick={() => save()} className="min-h-12 w-full rounded-xl border border-primary/50 bg-primary/20 text-sm font-bold text-primary">Save reading</button>
          <button type="button" onClick={connected ? disconnect : connectHeartSensor} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 text-sm font-semibold text-foreground">
            <Bluetooth className="h-4 w-4" />{connected ? 'Disconnect Heart Rate Sensor' : 'Connect Compatible HR Sensor'}
          </button>
          {status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}
          <p className="text-[11px] text-muted-foreground">For golf fitness tracking only, not medical diagnosis or emergency monitoring.</p>
        </section>
        <section className="glass-panel rounded-2xl p-3">
          <h3 className="mb-2 text-sm font-bold text-foreground">Saved readings ({entries.length})</h3>
          {!entries.length && <p className="text-xs text-muted-foreground">No readings recorded yet.</p>}
          <div className="space-y-2">
            {entries.map((entry) => <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {entry.heart !== null ? entry.heart + ' bpm' : 'HR —'}
                  {' · '}{entry.oxygen !== null ? entry.oxygen + '% SpO₂' : 'SpO₂ —'}
                </p>
                <p className="text-[11px] text-muted-foreground">{new Date(entry.date).toLocaleString()} {entry.notes ? '· ' + entry.notes : ''}</p>
              </div>
              <button type="button" onClick={() => remove(entry.id)} aria-label="Remove reading" className="min-h-10 min-w-10 rounded-lg border border-border text-destructive"><Trash2 className="mx-auto h-4 w-4" /></button>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
