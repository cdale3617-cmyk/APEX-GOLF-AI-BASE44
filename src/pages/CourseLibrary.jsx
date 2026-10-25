import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Trash2, Play, WifiOff, Search, MapPin, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { allCourses, addCourse, loadCourseHoles } from '@/lib/courses';
import { fetchHoles, searchGolfCourses } from '@/lib/osmCourses';
import { fetchCourseGraphics } from '@/lib/courseGraphics';
import { listOfflinePacks, removeOfflinePack, MAX_PACK_BYTES } from '@/lib/offlineCourseStorage';
import { downloadOfflineCourse } from '@/lib/courseDownload';
import { useOnline } from '@/lib/useOnline';
import { useGolf } from '@/lib/GolfContext';

const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-semibold disabled:opacity-40';
const vectorReady = (pack) => pack.graphics && Object.values(pack.graphics).some((g) => g.features.length > 0);

export default function CourseLibrary() {
  const [packs, setPacks] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const online = useOnline();
  const navigate = useNavigate();
  const { selectCourse } = useGolf();

  useEffect(() => {
    let live = true;
    listOfflinePacks().then((saved) => { if (live) setPacks(saved); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim() || searching || !online) return;
    setSearching(true); setError(''); setNotice('');
    try {
      const { courses: found = [], warnings = [] } = await searchGolfCourses(query.trim());
      setResults(found);
      if (warnings.length) setNotice(warnings.join(' '));
      else if (!found.length) setNotice('No matching courses found. Try the town or the full course name.');
    } catch (e) { setError(e.message || 'Course search is unavailable. Retry when connected.'); }
    finally { setSearching(false); }
  };

  const download = async (course) => {
    if (busy) return;
    setBusy(course.id); setProgress(null); setError(''); setNotice('');
    try {
      const pack = await downloadOfflineCourse(course, {
        loadHoles: (c) => c.source === 'user-mapped' ? loadCourseHoles(c) : fetchHoles(c),
        loadGraphics: (c) => fetchCourseGraphics(c, { refresh: true }),
        onProgress: setProgress,
      });
      addCourse(pack.course);
      setPacks((previous) => [pack, ...previous.filter((p) => p.course.id !== pack.course.id)]);
      setNotice(`${course.name}: ${pack.holes.length} mapped holes saved. ${vectorReady(pack) ? 'Available vector features included.' : 'Hole data only; vector features were unavailable.'}`);
    } catch (e) { setError(e.message || 'Download failed. Your previous download is still available; retry when connected.'); }
    finally { setBusy(''); setProgress(null); }
  };

  const remove = async (pack) => {
    if (!window.confirm(`Remove the offline download for ${pack.course.name}? Saved rounds and favourites will not be deleted.`)) return;
    setError('');
    try {
      await removeOfflinePack(pack.course.id);
      setPacks((previous) => previous.filter((p) => p.course.id !== pack.course.id));
      setNotice('Offline download removed. Saved rounds and favourites are unchanged.');
    } catch (e) { setError(e.message); }
  };

  const play = (pack) => {
    addCourse(pack.course);
    if (selectCourse(pack.course)) navigate('/play');
  };
  const downloadedIds = new Set(packs.map((p) => p.course.id));
  const matches = (course) => `${course.name} ${course.location || ''}`.toLowerCase().includes(query.trim().toLowerCase());
  const known = [...new Map([...results, ...allCourses().filter(matches)].map((course) => [course.id, course])).values()]
    .filter((course) => !downloadedIds.has(course.id));
  const shown = packs.filter((p) => matches(p.course));
  const bytes = packs.reduce((sum, pack) => sum + new TextEncoder().encode(JSON.stringify(pack)).byteLength, 0);

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-4">
      <PageHeader title="Course Downloads" subtitle="Prepare before your round. Play saved hole data without a signal." />
      <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">{online ? 'Your offline course library' : 'Offline mode'}</p>
          {!online && <WifiOff className="h-5 w-5 text-primary" />}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{packs.length} downloaded · {(bytes / 1024 / 1024).toFixed(2)} MB on this device</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Includes mapped tees, targets, pars and available vector features—not satellite images.
          Coverage varies; check pars against the course card. Browser storage can be cleared by the device.
        </p>
      </div>
      <form onSubmit={search} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="course-download-search">Search courses or towns</label>
        <input id="course-download-search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Course name or town" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 text-sm" />
        <button type="submit" className={BUTTON} disabled={!online || searching || !query.trim()}>
          <Search className="h-4 w-4" />{searching ? 'Finding…' : 'Find'}
        </button>
      </form>
      {!online && <p className="mt-2 text-xs text-muted-foreground">Search and new downloads need internet. Downloaded courses below remain available.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-destructive p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl border border-primary/40 p-3 text-xs">{notice}</p>}
      {busy && progress && (
        <div role="status" className="mt-4 rounded-xl border border-primary/40 p-3">
          <p className="text-xs">{progress.label}</p>
          <progress aria-label="Course download steps" value={progress.step} max={4} className="mt-2 w-full accent-teal-400" />
          <p className="text-[10px] text-muted-foreground">Step {progress.step} of 4 · This prepares a separate offline copy and does not change your current round.</p>
        </div>
      )}
      <section aria-labelledby="downloaded-courses-title" className="mt-5 space-y-3">
        <h2 id="downloaded-courses-title" className="text-sm font-bold">Downloaded courses</h2>
        {!shown.length && <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          {packs.length ? 'No downloads match this name.' : 'No downloads yet. Find a course or download one from your recent courses below.'}
        </p>}
        {shown.map((pack) => (
          <article key={pack.course.id} className="rounded-2xl border border-primary/30 bg-card p-4" aria-label={pack.course.name + ' download'}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold">{pack.course.name}</h3>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="mt-1 text-xs font-semibold text-primary">{pack.holes.length} mapped holes · {vectorReady(pack) ? 'Vector features + hole data offline' : 'Hole data offline'}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Saved {new Date(pack.savedAt).toLocaleDateString()} · Mapping may cover only part of the course</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={BUTTON} disabled={!!busy} onClick={() => play(pack)}><Play className="h-4 w-4" />Play</button>
              <button className={BUTTON} disabled={!!busy || !online} onClick={() => download(pack.course)}><RefreshCw className="h-4 w-4" />Update</button>
              <button className={BUTTON} disabled={!!busy} onClick={() => remove(pack)} aria-label={'Remove download for ' + pack.course.name}><Trash2 className="h-4 w-4" />Remove</button>
            </div>
          </article>
        ))}
      </section>
      <section aria-labelledby="available-courses-title" className="mt-6 space-y-3">
        <h2 id="available-courses-title" className="text-sm font-bold">Search results & recent courses</h2>
        {known.map((course) => (
          <article key={course.id} className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold">{course.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{course.location || 'Mapped golf course'}</p>
            <button className={BUTTON + ' mt-3 text-primary'} disabled={!!busy || !online} onClick={() => download(course)}
              aria-label={'Download ' + course.name}><Download className="h-4 w-4" />{busy === course.id ? 'Downloading…' : 'Download course'}</button>
          </article>
        ))}
      </section>
      <p className="mt-5 text-[10px] leading-relaxed text-muted-foreground">
        Downloads use OpenStreetMap data (© OpenStreetMap contributors, ODbL) and available course-card data, not Garmin’s licensed catalogue.
        Maximum {(MAX_PACK_BYTES / 1024 / 1024).toFixed(0)} MB per course. The installed Android app bundles the app screens; reopening this website offline may still require a connection.
      </p>
    </div>
  );
}
