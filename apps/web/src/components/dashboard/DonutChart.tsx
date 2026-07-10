"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ContractStatus } from "@plantor/shared";

const STATUS_LABELS: Record<ContractStatus, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE_ASSINATURA: "Pendente",
  ASSINADO: "Assinado",
  ENTREGA_PARCIAL: "Entrega parcial",
  LIQUIDADO: "Liquidado",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<ContractStatus, string> = {
  RASCUNHO: "#a3a3a3",
  PENDENTE_ASSINATURA: "#f59e0b",
  ASSINADO: "#dd5e2e",
  ENTREGA_PARCIAL: "#3b82f6",
  LIQUIDADO: "#16a34a",
  CANCELADO: "#dc2626",
};

export function DonutChart({ byStatus }: { byStatus: Record<ContractStatus, number> }) {
  const data = (Object.keys(byStatus) as ContractStatus[])
    .filter((status) => byStatus[status] > 0)
    .map((status) => ({ status, name: STATUS_LABELS[status], value: byStatus[status] }));

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">Sem contratos ainda.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
