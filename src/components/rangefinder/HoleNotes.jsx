import { useEffect, useState } from 'react';
import { NotebookPen, Save } from 'lucide-react';

const keyFor = (courseId, holeNumber) =>
  courseId && holeNumber ? 'apex-hole-note:' + courseId + ':' + holeNumber : null;

export default function HoleNotes({ courseId, holeNumber }) {
  const key = keyFor(courseId, holeNumber);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let next = '';
    try { if (key) next = localStorage.getItem(key) || ''; } catch { /* storage blocked */ }
    setDraft(next);
    setSaved(next);
    setNotice('');
  }, [key]);

  const save = () => {
    if (!key) return;
    try {
      const cleaned = draft.trim().slice(0, 500);
      if (cleaned) localStorage.setItem(key, cleaned);
      else localStorage.removeItem(key);
      setDraft(cleaned);
      setSaved(cleaned);
      setNotice(cleaned ? 'Saved for this hole' : 'Note cleared');
    } catch {
      setNotice('Storage unavailable on this phone');
    }
  };

  return (
    <section className="glass-hud min-w-0 space-y-1.5 rounded-xl border border-border/70 p-2" aria-label="Hole strategy notes">
      <div className="flex items-center gap-1 text-[10px] font-bold text-foreground">
        <NotebookPen className="h-3.5 w-3.5 text-primary" /> Hole strategy notes
      </div>
      <div className="flex min-w-0 gap-1">
        <input type="text" maxLength={500} disabled={!key} value={draft}
          onChange={(e) => { setDraft(e.target.value); setNotice(''); }}
          placeholder="e.g. favour left off tee"
          aria-label="Strategy note for selected hole"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary" />
        <button type="button" onClick={save} disabled={!key || draft.trim() === saved}
          aria-label="Save hole strategy note"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/50 bg-primary/15 text-primary disabled:opacity-40">
          <Save className="h-4 w-4" />
        </button>
      </div>
      {(notice || saved) && <p role="status" className="line-clamp-2 text-[10px] text-muted-foreground">{notice || saved}</p>}
    </section>
  );
}
