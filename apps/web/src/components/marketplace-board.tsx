'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { GrainType } from '@plantor/shared';
import { STORAGE_MOISTURE_MAX_PCT, indicativePriceCents } from '@plantor/shared';
import { Droplets, Leaf, Loader2, Satellite, Tractor } from 'lucide-react';
import { GrainChip, GrainIcon } from '@/components/grain-icon';
import { OfferInsights, QualityChip, VerificationChip } from '@/components/offer-insights';
import { Button } from '@/components/ui/button';
import { GRAIN_LABELS, formatMoney } from '@/lib/contracts';
import type { MarketplaceOffer } from '@/lib/offers';
import { acceptOffer } from '@/app/mercado/actions';

type SortKey = 'melhor_negocio' | 'menor_preco' | 'maior_quantidade' | 'recentes';

const SORT_LABEL: Record<SortKey, string> = {
  melhor_negocio: 'Melhor negócio (vs. referência)',
  menor_preco: 'Menor preço por saca',
  maior_quantidade: 'Maior quantidade',
  recentes: 'Mais recentes',
};

/** Diferença (centavos) do preço pedido para a referência indicativa. Negativo = abaixo da referência. */
function refDeltaCents(o: MarketplaceOffer): number | null {
  const ref = indicativePriceCents(o.grainType);
  if (ref == null || o.askingPriceCents == null) return null;
  return o.askingPriceCents - ref;
}

function PriceVsReference({ offer }: { offer: MarketplaceOffer }): React.ReactElement | null {
  const ref = indicativePriceCents(offer.grainType);
  const delta = refDeltaCents(offer);
  if (offer.askingPriceCents == null) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        preço a combinar
      </span>
    );
  }
  if (ref == null || delta == null) return null;
  const pct = Math.round((Math.abs(delta) / ref) * 1000) / 10;
  if (delta < 0) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/50 dark:text-green-300">
        ▼ {pct}% abaixo da referência
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        ▲ {pct}% acima da referência
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      na referência
    </span>
  );
}

function QualitySignals({ offer }: { offer: MarketplaceOffer }): React.ReactElement {
  const t = offer.telemetry;
  const moisture = t.storedMoisturePct ?? t.harvestMoisturePct;
  const moistureMax = STORAGE_MOISTURE_MAX_PCT[offer.grainType];
  const moistureOk = moisture != null && moistureMax != null ? moisture <= moistureMax : null;

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Tractor className="h-3.5 w-3.5" aria-hidden />
        {t.yieldSacksPerHa} sc/ha
      </span>
      {moisture != null ? (
        <span
          className={`flex items-center gap-1 ${moistureOk === false ? 'font-medium text-amber-700' : ''}`}
        >
          <Droplets className="h-3.5 w-3.5" aria-hidden />
          umidade {moisture}%
          {moistureMax != null
            ? moistureOk
              ? ` (≤ ${moistureMax}% ✓)`
              : ` (limite ${moistureMax}% ⚠)`
            : ''}
        </span>
      ) : null}
      {t.ndviAvg != null ? (
        <span className="flex items-center gap-1">
          <Leaf className="h-3.5 w-3.5" aria-hidden />
          NDVI {t.ndviAvg.toFixed(2)}
          {t.ndviAvg >= 0.7 ? ' (lavoura vigorosa)' : ''}
        </span>
      ) : null}
      {t.source ? (
        <span className="flex items-center gap-1">
          <Satellite className="h-3.5 w-3.5" aria-hidden />
          {t.source}
        </span>
      ) : null}
    </div>
  );
}

export function MarketplaceBoard({ offers }: { offers: MarketplaceOffer[] }): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [grainFilter, setGrainFilter] = useState<GrainType | 'todos'>('todos');
  const [sort, setSort] = useState<SortKey>('melhor_negocio');

  const grains = useMemo(() => Array.from(new Set(offers.map((o) => o.grainType))), [offers]);

  // Melhor preço por grão (entre ofertas com preço) — destaque de compra.
  const bestPriceByGrain = useMemo(() => {
    const best = new Map<GrainType, string>();
    for (const g of grains) {
      const priced = offers.filter((o) => o.grainType === g && o.askingPriceCents != null);
      if (priced.length < 2) continue;
      const cheapest = priced.reduce((a, b) =>
        a.askingPriceCents! <= b.askingPriceCents! ? a : b,
      );
      best.set(g, cheapest.id);
    }
    return best;
  }, [offers, grains]);

  const visible = useMemo(() => {
    const filtered =
      grainFilter === 'todos' ? offers : offers.filter((o) => o.grainType === grainFilter);
    const arr = [...filtered];
    switch (sort) {
      case 'menor_preco':
        arr.sort(
          (a, b) =>
            (a.askingPriceCents ?? Number.MAX_SAFE_INTEGER) -
            (b.askingPriceCents ?? Number.MAX_SAFE_INTEGER),
        );
        break;
      case 'maior_quantidade':
        arr.sort((a, b) => b.quantitySacks - a.quantitySacks);
        break;
      case 'recentes':
        arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'melhor_negocio':
        arr.sort(
          (a, b) =>
            (refDeltaCents(a) ?? Number.MAX_SAFE_INTEGER) -
            (refDeltaCents(b) ?? Number.MAX_SAFE_INTEGER),
        );
        break;
    }
    return arr;
  }, [offers, grainFilter, sort]);

  function accept(id: string): void {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await acceptOffer(id);
      setBusyId(null);
      if (!res.ok || !res.contractId) {
        setError(res.error ?? 'Erro ao gerar contrato.');
        return;
      }
      setConfirmId(null);
      router.push(`/contracts/${res.contractId}`);
      router.refresh();
    });
  }

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 p-10 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
          aria-hidden
        >
          <Satellite className="h-6 w-6 text-primary" />
        </span>
        <p className="font-medium">Nenhuma oferta disponível no momento</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Assim que um produtor disponibilizar um lote, ele aparece aqui com os dados de campo
          anexados — produtividade, umidade e NDVI.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtros e ordenação */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGrainFilter('todos')}
            className={`rounded-full border px-3 py-1 text-sm ${
              grainFilter === 'todos'
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'bg-card text-muted-foreground'
            }`}
          >
            Todos ({offers.length})
          </button>
          {grains.map((g) => {
            const count = offers.filter((o) => o.grainType === g).length;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrainFilter(g)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                  grainFilter === g
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                <GrainIcon grain={g} className="h-3.5 w-3.5" />
                {GRAIN_LABELS[g].label} ({count})
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Ordenar por
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border bg-card px-2 py-1.5 text-sm text-foreground"
          >
            {Object.entries(SORT_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="space-y-3">
        {visible.map((o) => {
          const grain = GRAIN_LABELS[o.grainType];
          const totalCents =
            o.askingPriceCents != null ? o.askingPriceCents * o.quantitySacks : null;
          const isBestPrice = bestPriceByGrain.get(o.grainType) === o.id;
          return (
            <div
              key={o.id}
              className={`rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${isBestPrice ? 'border-green-300 ring-1 ring-green-200 dark:border-green-800 dark:ring-green-900' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <GrainChip grain={o.grainType} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {o.quantitySacks.toLocaleString('pt-BR')} sacas de {grain.label} ·{' '}
                        {o.harvestYear}
                      </p>
                      {isBestPrice ? (
                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                          Melhor preço em {grain.label.toLowerCase()}
                        </span>
                      ) : null}
                      <VerificationChip verification={o.verification} />
                      <QualityChip quality={o.quality} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {o.seller.name}
                      {o.seller.city ? ` · ${o.seller.city}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold">
                        {o.askingPriceCents != null
                          ? `${formatMoney(String(o.askingPriceCents))}/saca`
                          : 'preço a combinar'}
                      </span>
                      <PriceVsReference offer={o} />
                    </div>
                    <QualitySignals offer={o} />
                    <OfferInsights offerId={o.id} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {totalCents != null ? (
                    <p className="text-sm text-muted-foreground">
                      Lote:{' '}
                      <strong className="text-foreground">{formatMoney(String(totalCents))}</strong>
                    </p>
                  ) : null}
                  <Button
                    onClick={() => {
                      setError(null);
                      setConfirmId(o.id);
                    }}
                    disabled={pending || confirmId === o.id}
                  >
                    Gerar contrato
                  </Button>
                </div>
              </div>

              {confirmId === o.id ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm">
                    Aceitar {o.quantitySacks.toLocaleString('pt-BR')} sacas de{' '}
                    {grain.label.toLowerCase()} de <strong>{o.seller.name}</strong>
                    {totalCents != null ? (
                      <>
                        {' '}
                        por <strong>{formatMoney(String(totalCents))}</strong>
                      </>
                    ) : null}
                    ? O contrato é gerado e vai para assinatura das duas partes.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => accept(o.id)} disabled={pending}>
                      {pending && busyId === o.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Gerando...
                        </>
                      ) : (
                        'Confirmar e gerar'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmId(null)}
                      disabled={pending}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Referência indicativa por saca:{' '}
        {grains
          .map((g) => {
            const ref = indicativePriceCents(g);
            return ref != null ? `${GRAIN_LABELS[g].label} ${formatMoney(String(ref))}` : null;
          })
          .filter(Boolean)
          .join(' · ')}
        . Não é cotação em tempo real.
      </p>
    </div>
  );
}
