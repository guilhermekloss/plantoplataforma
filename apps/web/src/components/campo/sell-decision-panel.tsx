import { Target } from 'lucide-react';
import { GrainChip } from '@/components/grain-icon';
import { SectionTitle } from '@/components/campo/metric';
import { GRAIN_LABELS, formatMoney } from '@/lib/contracts';
import { VERDICT_META, type FieldOverview } from '@/lib/field-data';

/** Painel "vender ou segurar": custo → preço de hoje → margem, por lote. */
export function SellDecisionPanel({ overview }: { overview: FieldOverview }): React.ReactElement | null {
  const withDecision = overview.crops.filter(
    (c) => c.decision?.breakEvenCentsPerSack != null && c.status !== 'vendido',
  );
  if (withDecision.length === 0) return null;
  return (
    <section className="mt-6">
      <SectionTitle icon={Target}>Vender ou segurar?</SectionTitle>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Cultura</th>
              <th className="p-3 font-medium">Seu custo/saca</th>
              <th className="p-3 font-medium">Preço hoje</th>
              <th className="p-3 font-medium">Margem/saca</th>
              <th className="p-3 font-medium">Leitura</th>
            </tr>
          </thead>
          <tbody>
            {withDecision.map((c) => {
              const d = c.decision!;
              const grain = GRAIN_LABELS[c.grainType];
              const quote = overview.market.quotes.find((q) => q.grainType === c.grainType);
              const verdict = d.verdict ? VERDICT_META[d.verdict] : null;
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      <GrainChip grain={c.grainType} size="sm" />
                      {grain.label}{' '}
                      <span className="font-normal text-muted-foreground">{c.harvestYear}</span>
                    </span>
                  </td>
                  <td className="p-3">{formatMoney(String(d.breakEvenCentsPerSack))}</td>
                  <td className="p-3">
                    {d.marketPriceCents != null ? formatMoney(String(d.marketPriceCents)) : '—'}
                    {quote ? (
                      <span
                        className={`ml-1 text-xs ${
                          quote.trend === 'alta'
                            ? 'text-green-700'
                            : quote.trend === 'queda'
                              ? 'text-red-700'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {quote.trend === 'alta' ? '▲' : quote.trend === 'queda' ? '▼' : '•'}{' '}
                        {quote.delta30dPct > 0 ? '+' : ''}
                        {quote.delta30dPct}% 30d
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 font-semibold">
                    {d.marginCentsPerSack != null ? (
                      <span className={d.marginCentsPerSack < 0 ? 'text-red-700' : 'text-green-700'}>
                        {formatMoney(String(d.marginCentsPerSack))}
                        {d.marginPct != null ? ` (${d.marginPct}%)` : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3">
                    {verdict ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${verdict.className}`}>
                        {verdict.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Custo por saca calculado do seu custo de produção ({formatMoney(
          String(withDecision[0]!.productionCost?.totalCostCentsPerHa ?? 0),
        )}/ha na primeira cultura) ÷ produtividade colhida. Preço: {overview.market.source}.
      </p>
    </section>
  );
}
