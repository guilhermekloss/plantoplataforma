'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function brl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/**
 * Estimador de precificação para o produtor: produtividade × área × preço/saca.
 * Começa no preço de referência indicativo e permite simular ("e se o preço for…").
 */
export function PricingEstimator({
  yieldSacksPerHa,
  areaHa,
  totalSacks,
  indicativePriceCents,
}: {
  yieldSacksPerHa: number;
  areaHa: number;
  totalSacks: number;
  indicativePriceCents: number | null;
}): React.ReactElement {
  const [price, setPrice] = useState(((indicativePriceCents ?? 6000) / 100).toFixed(2));
  const priceNum = Number(price) || 0;
  const grossCents = Math.round(yieldSacksPerHa * areaHa * priceNum * 100);

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-sm font-medium">Estimativa de receita</p>
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`price-${areaHa}`} className="text-xs">
            Preço por saca (R$)
          </Label>
          <Input
            id={`price-${areaHa}`}
            type="number"
            step="0.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-9 w-28"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Receita bruta estimada</p>
          <p className="text-xl font-semibold text-primary">{brl(grossCents)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {totalSacks.toLocaleString('pt-BR')} sacas estimadas
        {indicativePriceCents != null
          ? ` · referência indicativa ${brl(indicativePriceCents)}/saca`
          : ''}
      </p>
    </div>
  );
}
