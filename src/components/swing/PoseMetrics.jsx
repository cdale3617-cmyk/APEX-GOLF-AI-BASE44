const TILES = [
  { key: 'spine', label: 'Spine Angle', tone: 'text-foreground' },
  { key: 'shoulder', label: 'Shoulder Turn', tone: 'text-primary' },
  { key: 'hip', label: 'Hip Rotation', tone: 'text-amber-400' },
];

export default function PoseMetrics({ metrics }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-center">
      {TILES.map((tile) => (
        <div key={tile.key} className="rounded-xl bg-muted/40 p-2">
          <span className="hud-label block text-muted-foreground">{tile.label}</span>
          <span className={`text-sm font-bold tabular-nums ${tile.tone}`}>
            {metrics ? `${metrics[tile.key]}°` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}