import { useEffect, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';

const formatDuration = (ms) => {
  const total = Math.round((ms || 0) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const extension = (mimeType) => (mimeType?.includes('mp4') ? 'mp4' : 'webm');

export default function SwingVideoCard({ clip, onDelete }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(clip.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [clip.blob]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
      {url && <video src={url} controls playsInline className="h-40 w-full bg-black object-contain" />}

      <div className="flex items-center justify-between gap-2 p-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-foreground">
            {new Date(clip.date).toLocaleDateString()} · {formatDuration(clip.durationMs)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatSize(clip.size)}
            {clip.peakShoulder > 0 ? ` · peak shoulder ${clip.peakShoulder}°` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <a
            href={url}
            download={`apex-swing-${clip.id}.${extension(clip.mimeType)}`}
            aria-label="Download clip"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onDelete(clip.id)}
            aria-label="Delete clip"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}