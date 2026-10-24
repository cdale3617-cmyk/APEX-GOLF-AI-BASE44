import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, CameraOff, Download, RefreshCcw, SwitchCamera, Activity } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';

const KEY = 'apex_green_reader_settings_v1';
const readSettings = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const button = 'rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-bold text-foreground transition active:bg-muted';

/** Camera-assisted visual alignment only: no automatic slope or break sensing. */
export default function GreenReader() {
  const { course, hole } = useGolf();
  const init = useRef(readSettings());
  const [distance, setDistance] = useState(init.current.distance ?? 3);
  const [slope, setSlope] = useState(init.current.slope ?? 1);
  const [speed, setSpeed] = useState(init.current.speed ?? 10);
  const [direction, setDirection] = useState(init.current.direction ?? 'right');
  const [facing, setFacing] = useState('environment');
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState('');
  const [levelStatus, setLevelStatus] = useState('');
  const [levelBusy, setLevelBusy] = useState(false);
  const levelStopRef = useRef(null);
  const [photo, setPhoto] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ distance, slope, speed, direction })); }
    catch { /* optional settings */ }
  }, [distance, slope, speed, direction]);

  useEffect(() => {
    if (!cameraOn) return undefined;
    let live = true;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Unavailable camera interface');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!live) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('Camera ready. Align the green and adjust your putting line.');
      } catch (error) {
        if (!live) return;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOn(false);
        setStatus(error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
          ? 'Camera access blocked. Enable camera permission for APEX Golf AI in Android settings.'
          : 'Live camera unavailable. Use Take / Select Photo as an alternative.');
      }
    };
    start();
    return () => {
      live = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOn, facing]);

  // Unmount cleanup: no camera running behind other pages.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    levelStopRef.current?.();
  }, []);

  // Heuristic guide only. Real grain, green profile and putting dynamics unknown.
  const breakCm = Math.round(distance * distance * slope * 1.15 * Math.pow(speed / 10, 1.25));
  const shift = clamp(breakCm * 0.38, 0, 90);
  const signed = direction === 'right' ? -1 : 1;
  const aimX = 180 + signed * shift;
  const aimSide = direction === 'right' ? 'left' : 'right';
  const guidePath = 'M 180 470 Q ' + (180 + signed * shift * 2) + ' 270 180 70';

  // A phone resting with its TOP pointing toward the hole can measure an approximate
  // cross-tilt using its motion sensors. A camera image alone cannot infer slope.
  const measureLevel = async () => {
    if (typeof DeviceMotionEvent === 'undefined') {
      setLevelStatus('Motion sensors not exposed in this app. Use manual slope controls.'); return;
    }
    levelStopRef.current?.();
    setLevelBusy(true);
    setLevelStatus('Place the phone flat with its top pointing toward the hole, then keep it still.');
    try {
      if ('requestPermission' in DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
        const granted = await DeviceMotionEvent.requestPermission();
        if (granted !== 'granted') throw new Error('Motion permission denied.');
      }
    } catch (error) {
      setLevelBusy(false); setLevelStatus(error?.message || 'Motion permission unavailable.'); return;
    }
    let done = false;
    let values = [];
    const stop = () => {
      if (done) return;
      done = true;
      window.removeEventListener('devicemotion', sample);
      clearTimeout(timer);
      setLevelBusy(false);
      levelStopRef.current = null;
    };
    const sample = (event) => {
      const g = event.accelerationIncludingGravity;
      const x = Number(g?.x); const y = Number(g?.y); const z = Number(g?.z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
      const norm = Math.hypot(x, y, z);
      if (norm < 7 || norm > 12 || Math.abs(z) < 6) return;
      values.push({x,y,z});
      if (values.length < 15) return;
      const average = values.reduce((sum, value) => ({
        x: sum.x + value.x, y: sum.y + value.y, z: sum.z + value.z,
      }), {x:0,y:0,z:0});
      const gx = average.x / values.length;
      const gz = average.z / values.length;
      const grade = Math.abs(gx / gz) * 100;
      stop();
      if (grade > 5) {
        setLevelStatus('Measured cross-slope is above the 5% guide range. Check phone placement and adjust manually.');
        return;
      }
      setSlope(clamp(grade, 0, 5));
      setDirection(gx > 0 ? 'right' : 'left');
      setLevelStatus('Sensor cross-tilt about ' + grade.toFixed(1) + '%; verify left/right direction by eye. This is not camera contour detection.');
    };
    const timer = setTimeout(() => {
      stop();
      setLevelStatus('No stable motion reading. Check Android sensor permission and try again.');
    }, 6500);
    levelStopRef.current = stop;
    window.addEventListener('devicemotion', sample);
  };

  const toggleCamera = () => {
    if (cameraOn) { setCameraOn(false); setStatus('Camera stopped.'); return; }
    setPhoto('');
    setStatus('Opening camera…');
    setCameraOn(true);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!cameraOn || !video?.videoWidth) {
      setStatus('Open the camera before capturing.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = Math.max(600, Math.round(canvas.width * video.videoHeight / video.videoWidth));
    const ctx = canvas.getContext('2d');
    if (!ctx) { setStatus('Photo capture failed.'); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.85));
    setCameraOn(false);
    setStatus('Green photo captured. Putting line stays adjustable over your image.');
  };

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) {
      setStatus('Choose a photo smaller than 15 MB.'); return;
    }
    setCameraOn(false);
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setStatus('Photo loaded. Adjust the line over the green.');
    };
    reader.onerror = () => setStatus('Could not open that photo.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const savePhoto = () => {
    if (!photo) return;
    const link = document.createElement('a');
    link.href = photo;
    link.download = 'Apex-Green-' + new Date().toISOString().slice(0, 10) + '.jpg';
    link.click();
    setStatus('Photo download requested. Guide lines are displayed inside the app.');
  };

  const reset = () => {
    setDistance(3); setSlope(1); setSpeed(10); setDirection('right');
    setStatus('Manual putting guide reset.');
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-3">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader title="Green Reader · Camera"
          subtitle={(course?.name ?? 'Course') + ' · Hole ' + (hole?.number ?? '—') + ' · manual putting-line aid'}>
          <Link to="/more" className={button} aria-label="Back to More">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </PageHeader>

        <section className="glass-panel space-y-2 rounded-2xl p-2.5">
          <div className="relative mx-auto aspect-[3/4] max-h-[57dvh] w-full overflow-hidden rounded-xl border border-primary/30 bg-[#08121a]">
            <video ref={videoRef} muted playsInline autoPlay
              className={'absolute inset-0 h-full w-full object-cover ' + (cameraOn ? '' : 'hidden')} />
            {photo && !cameraOn && <img src={photo} alt="Captured golf green" className="absolute inset-0 h-full w-full object-cover" />}
            {!cameraOn && !photo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Camera className="h-12 w-12 text-primary" />
                <p className="max-w-[240px] text-sm font-semibold">
                  Open the camera for a live view of the green and putting guide
                </p>
              </div>
            )}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 360 520"
              preserveAspectRatio="none" aria-hidden="true">
              <line x1="180" y1="470" x2="180" y2="70" stroke="#ffffff" strokeWidth="2"
                strokeOpacity=".5" strokeDasharray="7 9" />
              <path d={guidePath} fill="none" stroke="#eec969" strokeWidth="5"
                strokeLinecap="round" opacity=".95" />
              <line x1="180" y1="470" x2={aimX} y2="70" stroke="#f9d976"
                strokeWidth="2" strokeDasharray="5 7" opacity=".8" />
              <circle cx="180" cy="470" r="11" fill="white" stroke="#072633" strokeWidth="3" />
              <circle cx="180" cy="70" r="16" fill="none" stroke="#ffffff" strokeWidth="3" />
              <circle cx={aimX} cy="70" r="5" fill="#eec969" />
              <text x="194" y="490" fill="white" fontSize="15" fontWeight="bold">BALL</text>
              <text x="202" y="64" fill="white" fontSize="15" fontWeight="bold">HOLE</text>
            </svg>
            <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-1.5 text-center text-[10px] font-bold tracking-wide text-white">
              MANUAL ESTIMATE · BREAKS {direction.toUpperCase()} · AIM {aimSide.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={toggleCamera} className={button + ' flex items-center justify-center gap-2'}>
              {cameraOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraOn ? 'Stop Camera' : 'Open Camera'}
            </button>
            <button type="button" onClick={capturePhoto} disabled={!cameraOn}
              className={button + ' flex items-center justify-center gap-2 disabled:opacity-40'}>
              <Camera className="h-4 w-4" /> Capture Photo
            </button>
            <button type="button" onClick={() => { setFacing((old) => old === 'environment' ? 'user' : 'environment'); setCameraOn(true); }}
              className={button + ' flex items-center justify-center gap-2'}>
              <SwitchCamera className="h-4 w-4" /> Switch Camera
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={button}>
              Take / Select Photo
            </button>
            <button type="button" onClick={savePhoto} disabled={!photo}
              className={button + ' flex items-center justify-center gap-2 disabled:opacity-40'}>
              <Download className="h-4 w-4" /> Save Photo
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={selectPhoto} className="hidden" aria-label="Choose a green photo" />
          <p role="status" className="min-h-4 text-[11px] text-muted-foreground">{status}</p>
        </section>

        <section className="glass-panel space-y-3 rounded-2xl p-3">
          <button type="button" onClick={measureLevel} disabled={levelBusy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/15 px-3 text-sm font-bold text-primary disabled:opacity-50">
            <Activity className="h-4 w-4" />
            {levelBusy ? 'Measuring phone tilt…' : 'Measure Cross-Slope with Phone Sensor'}
          </button>
          <p role="status" className="text-xs leading-relaxed text-muted-foreground">{levelStatus || 'Place the phone flat with its TOP facing the hole. Sensor tilt only; the camera cannot automatically map green contours.'}</p>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Putting-line adjustments</h3>
            <button type="button" onClick={reset} className={button} aria-label="Reset putting guide">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              Distance (metres)
              <input type="number" min=".5" max="30" step=".5" value={distance}
                onChange={(e) => setDistance(clamp(e.target.value, 0.5, 30))}
                className="w-full rounded-lg border border-input bg-background p-2 text-base text-foreground" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              Green speed (Stimp)
              <input type="number" min="6" max="15" step=".5" value={speed}
                onChange={(e) => setSpeed(clamp(e.target.value, 6, 15))}
                className="w-full rounded-lg border border-input bg-background p-2 text-base text-foreground" />
            </label>
          </div>
          <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
            Estimated cross-slope: {Number(slope).toFixed(1)}%
            <input type="range" min="0" max="5" step=".1" value={slope}
              onChange={(e) => setSlope(Number(e.target.value))}
              className="w-full accent-primary" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['left', 'right'].map((way) => (
              <button key={way} type="button" onClick={() => setDirection(way)}
                aria-pressed={direction === way}
                className={button + (direction === way ? ' border-primary bg-primary/20 text-primary' : '')}>
                Breaks {way}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
            <p className="text-xs font-bold text-primary">
              Approximate aim: {breakCm} cm {aimSide} of hole
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Training guide only. The camera does not measure contours or grain. The optional phone tilt reading is a rough cross-slope aid and needs a stable placement.
              Confirm the line by walking and reading the green.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
