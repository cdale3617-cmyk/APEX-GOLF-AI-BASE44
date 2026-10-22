import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGolf } from '@/lib/GolfContext';
import { distanceUnit, toDisplayDistance } from '@/lib/units';

export default function GappingChart({ clubs }) {
  const { units } = useGolf();
  const data = clubs
    .filter((club) => club.active && club.carry > 0)
    .map((club) => ({ name: club.name, carry: toDisplayDistance(club.carry, units) }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 6" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={44}
          />
          <YAxis
            domain={['dataMin - 15', 'dataMax + 10']}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--primary) / 0.08)' }}
            formatter={(value) => [`${value} ${distanceUnit(units)}`, 'Carry']}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              fontSize: 11,
              color: 'hsl(var(--foreground))',
            }}
          />
          <Bar dataKey="carry" fill="hsl(var(--primary))" fillOpacity={0.75} radius={[6, 6, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}