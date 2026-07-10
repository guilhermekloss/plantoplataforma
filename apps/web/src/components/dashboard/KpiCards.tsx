import { Card } from "@/components/ui/card";

export interface Kpi {
  label: string;
  value: string;
}

export function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <p className="text-xs text-neutral-500">{item.label}</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
