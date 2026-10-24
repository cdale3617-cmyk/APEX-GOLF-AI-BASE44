import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';

const SUBJECTS = ['Off-The-Tee', 'Approach', 'Around Green', 'Putting'];

export default function StrokesGainedChart({ strokes, hasRound }) {
  const data = SUBJECTS.map((subject, index) => ({ subject, value: strokes[index] ?? 0 }));

  return (
    <div className="w-full min-w-0">
      <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="58%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <PolarRadiusAxis domain={[-2, 2]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={hasRound ? 0.28 : 0.1}
          />
        </RadarChart>
      </ResponsiveContainer></div>

      {!hasRound && (
        <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
          Log a hole to see strokes gained
        </p>
      )}
    </div>
  );
}