'use client';

import { GRAIN_LABELS } from '@/lib/contracts';
import { PERIOD_LABELS, type WizardState } from '@/components/contract-wizard/wizard-state';

export function ReviewStep({
  state,
  tons,
  total,
}: {
  state: WizardState;
  tons: number;
  total: number;
}): React.ReactElement {
  const rows: [string, string][] = [
    ['Produtor', state.seller?.name ?? '—'],
    ['Grão', GRAIN_LABELS[state.grainType].label],
    ['Quantidade', `${state.quantitySacks} sacas (≈ ${tons.toLocaleString('pt-BR')} t)`],
    ['Safra', `${state.harvestYear} · ${PERIOD_LABELS[state.harvestPeriod]}`],
    ['Preço', state.priceType === 'fixo' ? `${state.pricePerSackReais} / saca` : 'Média de mercado'],
    [
      'Total estimado',
      total > 0
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: state.priceCurrency }).format(total)
        : '—',
    ],
    ['Armazém', `${state.warehouseName} — ${state.warehouseCity}/${state.warehouseState}`],
    ['Entrega até', state.deliveryDeadline],
    ['Frete', state.transportResponsible === 'seller' ? 'Produtor' : 'Comprador'],
    ['Cláusula penal', `${state.penaltyPct}%`],
  ];
  return (
    <div className="space-y-4">
      <h2 className="font-medium">Revisão</h2>
      <dl className="divide-y rounded-md border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 p-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        O contrato será criado como rascunho. Você poderá enviá-lo para assinatura em seguida.
      </p>
    </div>
  );
}
