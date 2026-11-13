import { Beef } from 'lucide-react';
import { Metric, SectionTitle } from '@/components/campo/metric';
import type { FieldOverview } from '@/lib/field-data';

/** Pecuária (fazenda mista): rebanho recebido de brincos/balança. */
export function LivestockPanel({ overview }: { overview: FieldOverview }): React.ReactElement | null {
  const l = overview.livestock;
  if (!l || !l.herd || l.herd.length === 0) return null;
  return (
    <section className="mt-6">
      <SectionTitle icon={Beef}>Pecuária</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Rebanho total" value={`${l.totalHead.toLocaleString('pt-BR')} cabeças`} />
        <Metric
          label="Pastagem"
          value={l.pastureHa != null ? `${l.pastureHa.toLocaleString('pt-BR')} ha` : '—'}
        />
        <Metric
          label="Lotação"
          value={l.stockingRateHeadPerHa != null ? `${l.stockingRateHeadPerHa} cab/ha` : '—'}
        />
        <Metric
          label="GMD engorda"
          value={(() => {
            const g = l.herd?.find((h) => h.category === 'engorda')?.gmdKgDay;
            return g != null ? `${g} kg/dia` : '—';
          })()}
        />
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Lote</th>
              <th className="p-3 font-medium">Raça</th>
              <th className="p-3 font-medium">Cabeças</th>
              <th className="p-3 font-medium">Peso médio</th>
              <th className="p-3 font-medium">GMD</th>
            </tr>
          </thead>
          <tbody>
            {l.herd.map((h, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3 font-medium">{h.label ?? h.category ?? '—'}</td>
                <td className="p-3">{h.breed ?? '—'}</td>
                <td className="p-3">{h.headCount != null ? h.headCount.toLocaleString('pt-BR') : '—'}</td>
                <td className="p-3">{h.avgWeightKg != null ? `${h.avgWeightKg} kg` : '—'}</td>
                <td className="p-3">{h.gmdKgDay != null ? `${h.gmdKgDay} kg/dia` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {l.notes ? `${l.notes} ` : ''}
        {l.source ? `Fonte: ${l.source}.` : ''}
      </p>
    </section>
  );
}
