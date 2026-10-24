import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Camera, Download } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGolf } from '@/lib/GolfContext';
import { toDisplayDistance, distanceUnit } from '@/lib/units';
import { parseLaunchMonitorCsv } from '@/lib/launchImport';

const INPUT = 'min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground';
const STORAGE = 'apex_shot_studio_v1';
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, Number(value) || 0));
const getSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch { return []; }
};

// Visual trajectory estimation, NOT measured launch-monitor output.
// Integrate gravity and a simple aerodynamic drag model in metres.
export function estimateTrajectory(speedKmh, launchDeg, directionDeg, spinRpm, windKmh) {
  const speed = clamp(speedKmh, 10, 350) / 3.6;
  const launch = clamp(launchDeg, 1, 80) * Math.PI / 180;
  const direction = clamp(directionDeg, -35, 35) * Math.PI / 180;
  const wind = clamp(windKmh, -60, 60) / 3.6;
  const sideFactor = clamp(spinRpm, -5000, 5000) / 5000;
  let x = 0; let y = 0; let z = 0;
  let vx = speed * Math.cos(launch) * Math.cos(direction);
  let vy = speed * Math.cos(launch) * Math.sin(direction);
  let vz = speed * Math.sin(launch);
  let maxHeight = 0; let time = 0;
  const points = [{ x, y, z }];
  const dt = 0.04;
  for (let i = 0; i < 500 && (z >= 0 || i === 0); i++) {
    const vrel = Math.hypot(vx - wind, vy, vz);
    const drag = 0.0023 * vrel;
    vx += -(vx - wind) * drag * dt;
    vy += (-vy * drag + sideFactor * 0.85) * dt;
    vz += (-9.81 - vz * drag) * dt;
    x += vx * dt; y += vy * dt; z += vz * dt;
    maxHeight = Math.max(maxHeight, z);
    time += dt;
    points.push({ x, y, z: Math.max(0, z) });
    if (z < 0) break;
  }
  return { points, carryMetres: Math.max(0, Math.hypot(x, y)), peakMetres: maxHeight, flightSeconds: time, offlineOnly: true };
}

export default function ShotStudio() {
  const { lastSwing, units, learnedClubs } = useGolf();
  const [tab, setTab] = useState('tracer');
  const [media, setMedia] = useState(null);
  const [dots, setDots] = useState([]);
  const [speed, setSpeed] = useState('145');
  const [angle, setAngle] = useState('16');
  const [direction, setDirection] = useState('0');
  const [spin, setSpin] = useState('0');
  const [wind, setWind] = useState('0');
  const [clubId, setClubId] = useState('dr');
  const [records, setRecords] = useState(getSaved);
  const [notice, setNotice] = useState('');
  const [importedShot, setImportedShot] = useState(null);
  const mediaRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => () => { if (media?.url) URL.revokeObjectURL(media.url); }, [media]);
  const result = useMemo(() => estimateTrajectory(speed, angle, direction, spin, wind), [speed, angle, direction, spin, wind]);
  const maxX = Math.max(1, result.carryMetres);
  const maxH = Math.max(1, result.peakMetres);
  const plot = result.points.filter((_, i) => i % 3 === 0 || i === result.points.length - 1)
    .map((p) => String(20 + p.x / maxX * 320) + ',' + String(194 - p.z / maxH * 160)).join(' ');

  const openMedia = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setNotice('Select an image or video.'); return;
    }
    if (file.size > 90 * 1024 * 1024) { setNotice('Choose a file smaller than 90 MB.'); return; }
    setMedia({ url: URL.createObjectURL(file), video: file.type.startsWith('video/') });
    setDots([]); setNotice('Tap ball start, flight apex and landing in that order.');
    event.target.value = '';
  };
  const tracePoint = (event) => {
    if (!media || dots.length === 3) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
    const y = clamp((event.clientY - rect.top) / rect.height * 100, 0, 100);
    setDots((current) => [...current, { x, y }]);
  };
  const saveTrace = () => {
    if (!media || dots.length !== 3) return;
    const source = media.video ? mediaRef.current : imageRef.current;
    if (!source) return;
    const width = media.video ? source.videoWidth : source.naturalWidth;
    const height = media.video ? source.videoHeight : source.naturalHeight;
    if (!width || !height) { setNotice('Media is not ready.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(source, 0, 0, width, height);
    const points = dots.map((p) => ({ x: p.x / 100 * width, y: p.y / 100 * height }));
    ctx.strokeStyle = '#f9d976'; ctx.lineWidth = Math.max(4, width / 200);
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y); ctx.stroke();
    points.forEach((p) => { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(p.x, p.y, width / 90, 0, Math.PI * 2); ctx.fill(); });
    canvas.toBlob((blob) => {
      if (!blob) { setNotice('Could not export image.'); return; }
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'APEX-shot-trace.png'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setNotice('Traced image exported.');
    }, 'image/png');
  };
  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('CSV must be under 2 MB.');
      const rows = parseLaunchMonitorCsv(await file.text());
      const selected = rows[0];
      setImportedShot({ ...selected, count: rows.length });
      setSpeed(String(selected.speedKmh.toFixed(1)));
      setAngle(String(selected.angle));
      setDirection(String(selected.direction));
      setSpin(String(selected.sideSpin));
      const known = learnedClubs.find((club) => {
        const a=club.name.toLowerCase().replace(/[^a-z0-9]/g,'');
        const b=selected.club.toLowerCase().replace(/[^a-z0-9]/g,'');
        return b && (a===b || a.includes(b) || b.includes(a));
      });
      if (known) setClubId(known.id);
      setTab('trajectory');
      setNotice('Imported ' + rows.length + ' measured shot(s). Showing the first. Trajectory is still simulated.');
    } catch (error) { setNotice(error?.message || 'Could not import launch monitor data.'); }
    event.target.value='';
  };
  const saveEstimate = () => {
    const entry = {
      id: String(Date.now()), date: new Date().toISOString(), clubId, speed: Number(speed), angle: Number(angle),
      direction: Number(direction), spin: Number(spin), wind: Number(wind),
      carryMetres: Number(result.carryMetres.toFixed(1)), peakMetres: Number(result.peakMetres.toFixed(1)),
    };
    const next = [entry, ...records].slice(0, 60);
    try { localStorage.setItem(STORAGE, JSON.stringify(next)); setRecords(next); setNotice('Estimated shot saved on this device.'); }
    catch { setNotice('Storage unavailable: estimate not saved.'); }
  };
  const clubName = (id) => learnedClubs.find((club) => club.id === id)?.name || id;
  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-3">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader title="Shot Studio" subtitle="Manual video tracer, trajectory model and swing kinetics">
          <Link to="/more" className="rounded-lg border border-border bg-muted/60 p-2 text-foreground" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </PageHeader>
        <div className="grid grid-cols-3 gap-2">
          {['tracer','trajectory','kinetics'].map((item) => <button key={item} type="button" onClick={() => setTab(item)}
            className={'min-h-11 rounded-xl border px-2 py-2 text-xs font-bold capitalize ' + (tab === item ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/50 text-foreground')}>{item}</button>)}
        </div>
        {tab === 'tracer' && <section className="glass-panel space-y-3 rounded-2xl p-3">
          <p className="text-xs text-muted-foreground">Select a swing photo or video, pause on a frame, then mark start, apex and landing. Trace is a manual overlay, not automatic ball tracking.</p>
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 text-sm font-bold text-primary">
            <Camera className="h-4 w-4" /> Take / Select Photo or Video
            <input type="file" accept="image/*,video/*" capture="environment" onChange={openMedia} className="sr-only" />
          </label>
          {media && <div className="relative overflow-hidden rounded-xl bg-black" style={{aspectRatio:'16 / 10'}} onClick={tracePoint} role="presentation">
            {media.video ? <video ref={mediaRef} src={media.url} controls playsInline className="h-full w-full object-contain" /> :
              <img ref={imageRef} src={media.url} alt="Shot tracing reference" className="h-full w-full object-contain" />}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {dots.length === 3 && <path d={'M '+dots[0].x+' '+dots[0].y+' Q '+dots[1].x+' '+dots[1].y+' '+dots[2].x+' '+dots[2].y}
                fill="none" stroke="#f9d976" strokeWidth="1.0" strokeLinecap="round" />}
              {dots.map((point,i) => <circle key={i} cx={point.x} cy={point.y} r="1.4" fill="#ef4444" stroke="white" strokeWidth=".4" />)}
            </svg>
          </div>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDots([])} disabled={!dots.length} className="min-h-11 flex-1 rounded-lg border border-border px-2 text-xs font-bold text-foreground disabled:opacity-40">Reset markers</button>
            <button type="button" onClick={saveTrace} disabled={dots.length!==3} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-primary/50 bg-primary/20 px-2 text-xs font-bold text-primary disabled:opacity-40">
              <Download className="h-4 w-4" /> Export trace
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Markers placed: {dots.length}/3. For video, tap a still frame outside the playback controls.</p>
        </section>}
        {tab === 'trajectory' && <section className="glass-panel space-y-3 rounded-2xl p-3">
          <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-primary/40 bg-primary/15 px-3 text-xs font-bold text-primary">
            Import launch-monitor CSV (ball speed, launch angle)
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={importCsv} />
          </label>
          {importedShot && <p className="rounded-lg border border-border bg-muted/40 p-2 text-xs text-foreground">
            Imported measured ball speed: {importedShot.speedKmh.toFixed(1)} km/h · Launch: {importedShot.angle}° · Backspin: {importedShot.spin === null ? 'not provided' : importedShot.spin + ' rpm'}
            {importedShot.carry===null ? '' : ' · Source carry: '+importedShot.carry+' (check CSV units)'}
          </p>}
          <p className="text-xs text-muted-foreground">Illustrative flight only. Enter launch values from a real launch monitor or your own estimates. The app does not measure ball speed, spin or true six-axis ball motion.</p>
          <label className="block text-xs text-foreground">Club
            <select className={INPUT} value={clubId} onChange={(e) => setClubId(e.target.value)}>
              {learnedClubs.filter((club) => club.id !== 'pt').map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Ball speed (km/h)', value: speed, setValue: setSpeed },
              { label: 'Launch angle (degrees)', value: angle, setValue: setAngle },
              { label: 'Direction (degrees)', value: direction, setValue: setDirection },
              { label: 'Sidespin proxy (rpm)', value: spin, setValue: setSpin },
              { label: 'Head / tail wind (km/h)', value: wind, setValue: setWind },
            ].map(({label,value,setValue}) => <label key={label} className="text-xs text-foreground">
              {label}<input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={INPUT} />
            </label>)}
          </div>
          <svg viewBox="0 0 360 220" aria-label="Illustrative trajectory curve" role="img" className="w-full rounded-xl bg-slate-950">
            <line x1="20" y1="194" x2="344" y2="194" stroke="#64748b" strokeWidth="1" />
            <polyline points={plot} fill="none" stroke="#f9d976" strokeWidth="3" strokeLinecap="round" />
            <text x="18" y="212" fill="#fff" fontSize="11">Launch</text>
            <text x="280" y="212" fill="#fff" fontSize="11">Landing</text>
          </svg>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">Est. carry</p><p className="text-base font-bold text-foreground">{toDisplayDistance(result.carryMetres / 0.9144, units)} {distanceUnit(units)}</p></div>
            <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">Est. peak</p><p className="text-base font-bold text-foreground">{result.peakMetres.toFixed(1)} m</p></div>
            <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">Est. flight</p><p className="text-base font-bold text-foreground">{result.flightSeconds.toFixed(1)} s</p></div>
          </div>
          <button type="button" onClick={saveEstimate} className="min-h-12 w-full rounded-xl border border-primary/50 bg-primary/20 text-sm font-bold text-primary">Save estimated flight</button>
          {records.length>0 && <div className="space-y-1 border-t border-border pt-2">
            <p className="text-xs font-semibold text-foreground">Saved estimates ({records.length})</p>
            {records.slice(0,6).map((item)=><p key={item.id} className="rounded-lg bg-muted/30 p-2 text-[11px] text-foreground">{clubName(item.clubId)} · {item.carryMetres.toFixed(0)} m estimated · {new Date(item.date).toLocaleDateString()}</p>)}
          </div>}
        </section>}
        {tab === 'kinetics' && <section className="glass-panel space-y-3 rounded-2xl p-3">
          <div className="flex items-center gap-2 text-primary"><Activity className="h-5 w-5" /><h3 className="text-sm font-bold">Swing kinetics</h3></div>
          <p className="text-xs text-muted-foreground">The existing Swing Monitor uses the camera to estimate shoulder turn, hip turn and posture. These are body-pose estimates, not measured clubhead forces or full ball 6DoF.</p>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Last recorded peak shoulder turn</p>
            <p className="text-2xl font-black text-foreground">{lastSwing && Number.isFinite(Number(lastSwing.peakShoulder)) ? String(lastSwing.peakShoulder) + '°' : 'No swing captured'}</p>
          </div>
          <Link to="/swing" className="flex min-h-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/20 text-sm font-bold text-primary">Open camera Swing Monitor</Link>
        </section>}
        {notice && <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-xs text-foreground">{notice}</p>}
      </div>
    </div>
  );
}
