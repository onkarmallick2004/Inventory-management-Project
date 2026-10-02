// Stacked bar chart: service jobs closed per month, split by job type.
// Colours follow a fixed order (blue, orange, aqua) so a type always keeps its colour.
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const SERIES = [
  { key: 'ROUTINE', name: 'Routine', color: '#2a78d6' },
  { key: 'BREAKDOWN', name: 'Breakdown', color: '#eb6834' },
  { key: 'INSTALLATION', name: 'Installation', color: '#1baf7a' },
];

const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

export default function JobsChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,184,0.15)' }}
            labelFormatter={(key) => {
              const [y, m] = key.split('-');
              return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            }}
          />
          {/* Legend text stays grey; the coloured dot carries the identity. */}
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: '#475569' }}>{value}</span>} />
          {SERIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="jobs"
              fill={s.color}
              stroke="#ffffff"
              strokeWidth={1}
              radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
