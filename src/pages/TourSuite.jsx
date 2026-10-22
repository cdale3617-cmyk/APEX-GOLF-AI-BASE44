import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, MapPin, Sun, FastForward } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CoursePinCreator from '@/components/tour/CoursePinCreator';
import { downloadCoursePacks, importCoursePacks, saveCustomCourse } from '@/lib/coursePacks';
import { allCourses, cachedHoles } from '@/lib/courses';
import { useGolf } from '@/lib/GolfContext';

const B = 'rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-xs font-semibold text-foreground transition active:bg-muted';

export default function TourSuite() {
  const { course, gpsFix, selectCourse, autoAdvance, setAutoAdvance,
    keepScreenAwake, setKeepScreenAwake } = useGolf();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [notice, setNotice] = useState('');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [name, setName] = useState('');
  const [creatorHoles, setCreatorHoles] = useState([]);
  const [revision, setRevision] = useState(0);
  const [courseToOpen, setCourseToOpen] = useState('');
  const center = course?.center || gpsFix?.coords || [-23.09, 150.75];

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const count = await importCoursePacks(file);
      setNotice(count + ' course pack' + (count === 1 ? '' : 's') + ' imported on this device.');
      setRevision((n) => n + 1);
    } catch (err) {
      setNotice(err.message || 'Unable to import this JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  const saveCreator = () => {
    try {
      const saved = saveCustomCourse({ name, center, holes: creatorHoles });
      setNotice(saved.name + ' saved on this device. You can select it below.');
      setName('');
      setCreatorHoles([]);
      setCreatorOpen(false);
      setRevision((n) => n + 1);
      setCourseToOpen(saved.id);
    } catch (err) {
      setNotice(err.message || 'Unable to save course.');
    }
  };

  const savedCourses = allCourses().filter((item) => cachedHoles(item.id)?.length);

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title="Tour Performance Suite" subtitle="On-course controls and offline course packs">
          <Link to="/more" className={B} aria-label="Back to More"><ArrowLeft className="h-4 w-4" /></Link>
        </PageHeader>

        <section className="glass-panel space-y-3 rounded-2xl p-3">
          <h3 className="text-sm font-bold text-foreground">On-course controls</h3>
          <button type="button" aria-pressed={keepScreenAwake}
            onClick={() => setKeepScreenAwake(!keepScreenAwake)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-foreground">
            <span className="flex items-center gap-2"><Sun className="h-4 w-4 text-primary" /> Keep screen awake</span>
            <strong className={keepScreenAwake ? 'text-primary' : 'text-muted-foreground'}>{keepScreenAwake ? 'ON' : 'OFF'}</strong>
          </button>
          <button type="button" aria-pressed={autoAdvance}
            onClick={() => setAutoAdvance(!autoAdvance)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-foreground">
            <span className="flex items-center gap-2"><FastForward className="h-4 w-4 text-primary" /> Next hole after confirming score</span>
            <strong className={autoAdvance ? 'text-primary' : 'text-muted-foreground'}>{autoAdvance ? 'ON' : 'OFF'}</strong>
          </button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Screen wake-lock works where Android supports it. Auto-hole advances after confirming a completed score
            on the Score screen, not while typing. The Front / Centre / Back pin targets are on the GPS screen.
          </p>
        </section>

        <section className="glass-panel space-y-3 rounded-2xl p-3">
          <h3 className="text-sm font-bold text-foreground">Offline course packs</h3>
          <p className="text-xs text-muted-foreground">
            Export or import saved hole coordinates as an APEX JSON course pack.
            Offline coordinates do not guarantee offline satellite photos or live course search.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { downloadCoursePacks(); setNotice('Saved course coordinates exported as JSON.'); }}
              className={B}><Download className="mr-1 inline h-4 w-4" /> Export JSON</button>
            <button type="button" onClick={() => inputRef.current?.click()} className={B}>
              <Upload className="mr-1 inline h-4 w-4" /> Import JSON</button>
          </div>
          <input ref={inputRef} type="file" className="hidden" accept=".json,application/json" onChange={importFile} />
          <p className="text-xs text-muted-foreground">{savedCourses.length} mapped courses saved on this device</p>
          {revision >= 0 && savedCourses.length > 0 && (
            <div className="flex gap-2">
              <select value={courseToOpen} onChange={(e) => setCourseToOpen(e.target.value)}
                aria-label="Saved course"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background p-2 text-xs text-foreground">
                <option value="">Choose a saved course</option>
                {savedCourses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button type="button" disabled={!courseToOpen} className={B + ' disabled:opacity-40'}
                onClick={() => { selectCourse(courseToOpen); navigate('/'); }}>Open</button>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <button type="button" onClick={() => setCreatorOpen((on) => !on)}
            className={B + ' flex w-full items-center justify-center gap-2'}>
            <MapPin className="h-4 w-4" /> {creatorOpen ? 'Close Pin-Drop Creator' : 'Pin-Drop Course Creator'}
          </button>
          {creatorOpen && (
            <>
              <label className="block text-xs font-semibold text-muted-foreground">
                Course name
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
                  placeholder="My golf course" className="mt-1 w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground" />
              </label>
              <CoursePinCreator center={center} holeCount={creatorHoles.length}
                onAddHole={(hole) => setCreatorHoles((prev) => [...prev, hole])} />
              <p className="text-xs text-primary">{creatorHoles.length} hole{creatorHoles.length === 1 ? '' : 's'} drawn</p>
              <button type="button" onClick={saveCreator} disabled={!name.trim() || !creatorHoles.length}
                className="w-full rounded-lg border border-primary/50 bg-primary/20 px-3 py-3 text-sm font-bold text-primary disabled:opacity-40">
                Save mapped course
              </button>
            </>
          )}
        </section>
        {notice && <p role="status" className="glass-panel rounded-xl border border-primary/40 p-3 text-xs text-primary">{notice}</p>}
      </div>
    </div>
  );
}
