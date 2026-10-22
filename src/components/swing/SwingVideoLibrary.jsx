import { useCallback, useEffect, useState } from 'react';
import SwingVideoCard from '@/components/swing/SwingVideoCard';
import { deleteSwingVideo, listSwingVideos } from '@/lib/swingVideos';

export default function SwingVideoLibrary() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await listSwingVideos();
    setClips(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('apex-swing-video', handler);
    return () => window.removeEventListener('apex-swing-video', handler);
  }, [refresh]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this swing clip from your device?')) return;
    await deleteSwingVideo(id);
    refresh();
  };

  return (
    <section className="glass-panel rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="hud-label font-bold text-muted-foreground">Saved Swings</span>
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {clips.length}
        </span>
      </div>

      {loading ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">Loading your clips…</p>
      ) : clips.length === 0 ? (
        <p className="py-4 text-center text-[11px] leading-snug text-muted-foreground">
          No swings saved yet. Hit Rec above and the clip lands here with the skeleton and angles baked in.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {clips.map((clip) => (
            <SwingVideoCard key={clip.id} clip={clip} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <p className="mt-2 border-t border-border/70 pt-2 text-[10px] text-muted-foreground">
        Clips stay on this device — delete them here or download to keep them.
      </p>
    </section>
  );
}