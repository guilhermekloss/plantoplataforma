'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ContractStatus } from '@plantor/shared';
import { STATUS_LABELS } from '@/lib/contracts';

// Paleta liderada pela terracota da marca, com tons quentes/neutros de apoio.
const COLORS = ['#dd5e2e', '#e8893f', '#b5471f', '#caa07a', '#6b7280', '#2563eb', '#16a34a', '#eab308', '#a8a29e'];

export function StatusDonut({
  data,
}: {
  data: { status: ContractStatus; count: number }[];
}): React.ReactElement {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem contratos para exibir.</p>;
  }
  const chartData = data.map((d) => ({ name: STATUS_LABELS[d.status], value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
