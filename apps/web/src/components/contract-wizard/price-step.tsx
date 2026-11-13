'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumField } from '@/components/contract-wizard/num-field';
import type { StepProps, WizardState } from '@/components/contract-wizard/wizard-state';

export function PriceStep({
  state,
  set,
  total,
}: StepProps & { total: number }): React.ReactElement {
  return (
    <div className="space-y-4">
      <h2 className="font-medium">Preço e pagamento</h2>
      <div className="space-y-2">
        <Label htmlFor="ptype">Tipo de fixação</Label>
        <select
          id="ptype"
          value={state.priceType}
          onChange={(e) => set('priceType', e.target.value as WizardState['priceType'])}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="fixo">Preço fixo</option>
          <option value="media_mercado">Média de mercado</option>
          <option value="indexado_b3" disabled>
            Indexado B3 (em breve)
          </option>
        </select>
      </div>
      {state.priceType === 'fixo' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="moeda">Moeda</Label>
            <select
              id="moeda"
              value={state.priceCurrency}
              onChange={(e) => set('priceCurrency', e.target.value as WizardState['priceCurrency'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="BRL">R$ (BRL)</option>
              <option value="USD">US$ (USD)</option>
            </select>
          </div>
          <NumField
            label="Valor por saca"
            value={state.pricePerSackReais}
            onChange={(v) => set('pricePerSackReais', v)}
          />
        </div>
      )}
      {total > 0 && (
        <p className="rounded-md bg-muted/40 p-3 text-sm">
          Valor total estimado:{' '}
          <strong>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: state.priceCurrency,
            }).format(total)}
          </strong>
        </p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.barterEnabled}
          onChange={(e) => set('barterEnabled', e.target.checked)}
        />
        Adiantamento / barter (financiamento de insumos)
      </label>
      {state.barterEnabled && (
        <div className="space-y-3">
          <NumField label="% de adiantamento" value={state.advancePct} onChange={(v) => set('advancePct', v)} />
          <div className="space-y-2">
            <Label htmlFor="barter">Descrição dos insumos</Label>
            <Input
              id="barter"
              value={state.barterDescription}
              onChange={(e) => set('barterDescription', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
