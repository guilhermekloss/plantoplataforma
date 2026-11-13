'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { GrainChip } from '@/components/grain-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GRAIN_LABELS } from '@/lib/contracts';
import { LOT_STATUS_BADGE, LOT_STATUS_LABEL, type ContractSuggestion } from '@/lib/offers';
import type { CropTelemetry } from '@/lib/field-data';
import { createOffer } from '@/app/producao/actions';

function brl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function ProductionBoard({
  suggestions,
  aiEnabled,
  crops,
}: {
  suggestions: ContractSuggestion[];
  aiEnabled: boolean;
  crops: CropTelemetry[];
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      suggestions.map((s) => [s.fieldReadingId, (s.suggestedPriceCents / 100).toFixed(2)]),
    ),
  );

  function offer(s: ContractSuggestion): void {
    setError(null);
    const priceCents = Math.round((Number(prices[s.fieldReadingId]) || 0) * 100);
    startTransition(async () => {
      const res = await createOffer({
        fieldReadingId: s.fieldReadingId,
        quantitySacks: s.quantitySacks,
        askingPriceCents: priceCents,
      });
      if (!res.ok) {
        setError(res.error ?? 'Erro.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10"
            aria-hidden
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <h2 className="font-semibold">O agente sugere</h2>
          {!aiEnabled ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              sugestão automática
            </span>
          ) : null}
        </div>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lote apto para ofertar no momento. Assim que um lote for colhido e secado, ele
            aparece aqui automaticamente.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => {
              const crop = crops.find((c) => c.id === s.fieldReadingId);
              const breakEven = crop?.decision?.breakEvenCentsPerSack ?? null;
              const priceCents = Math.round((Number(prices[s.fieldReadingId]) || 0) * 100);
              const marginCents = breakEven != null ? priceCents - breakEven : null;
              return (
                <div
                  key={s.fieldReadingId}
                  className="rounded-xl border border-primary/30 bg-gradient-to-br from-accent/60 to-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <GrainChip grain={s.grainType} size="sm" className="mt-0.5" />
                    <div>
                      <p className="font-medium">{s.headline}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{s.rationale}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`p-${s.fieldReadingId}`} className="text-xs">
                        Preço por saca (R$)
                      </Label>
                      <Input
                        id={`p-${s.fieldReadingId}`}
                        type="number"
                        step="0.5"
                        className="h-9 w-28"
                        value={prices[s.fieldReadingId] ?? ''}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [s.fieldReadingId]: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        sugerido: {brl(s.suggestedPriceCents)}
                        {s.priceContext &&
                        s.priceContext.suggestedPriceCents !== s.priceContext.referencePriceCents
                          ? ` (referência ${brl(s.priceContext.referencePriceCents)})`
                          : ''}
                      </p>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      {s.quantitySacks.toLocaleString('pt-BR')} sacas · estimado{' '}
                      <strong className="text-foreground">
                        {brl(
                          Math.round(
                            s.quantitySacks * (Number(prices[s.fieldReadingId]) || 0) * 100,
                          ),
                        )}
                      </strong>
                      {marginCents != null && priceCents > 0 ? (
                        <p
                          className={`mt-0.5 text-xs ${marginCents < 0 ? 'font-medium text-red-700' : 'text-green-700'}`}
                        >
                          Seu custo é {brl(breakEven!)}/saca → margem de {brl(marginCents)}/saca
                          {marginCents < 0 ? ' (abaixo do custo!)' : ''}
                        </p>
                      ) : null}
                    </div>
                    <Button onClick={() => offer(s)} disabled={pending}>
                      {pending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      Disponibilizar para venda
                    </Button>
                  </div>
                  {s.priceContext && s.priceContext.drivers.length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-primary/20 pt-2">
                      {s.priceContext.drivers.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-baseline gap-1.5 text-xs text-muted-foreground"
                        >
                          <span className="text-primary" aria-hidden>
                            •
                          </span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Minha produção (coletada automaticamente)</h2>
        <div className="space-y-3">
          {crops.map((c) => {
            const grain = GRAIN_LABELS[c.grainType];
            return (
              <Link
                key={c.id}
                href="/campo"
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <GrainChip grain={c.grainType} />
                  <div>
                    <p className="font-medium">
                      {grain.label} · {c.harvestYear}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {c.yieldSacksPerHa} sc/ha · {c.areaHa} ha
                      {c.availableSacks != null
                        ? ` · ${c.availableSacks.toLocaleString('pt-BR')} sacas disponíveis`
                        : ''}
                      {c.storedMoisturePct != null ? ` · armazenado ${c.storedMoisturePct}%` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LOT_STATUS_BADGE[c.status] ?? 'bg-muted'}`}
                >
                  {LOT_STATUS_LABEL[c.status] ?? c.status}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
