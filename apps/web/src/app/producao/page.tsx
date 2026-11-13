import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, ChevronRight, Satellite, ShoppingBag } from 'lucide-react';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/server-api';
import { AppHeader } from '@/components/app-header';
import { GrainChip } from '@/components/grain-icon';
import { ProductionBoard } from '@/components/production-board';
import { GRAIN_LABELS, formatMoney, formatSacks } from '@/lib/contracts';
import type { FieldOverview } from '@/lib/field-data';
import { type MyOffer, type SuggestionsResult } from '@/lib/offers';

const INTEGRATIONS = ['Colheitadeira', 'Plantadeira', 'Trator', 'Drone', 'Estação meteorológica'];

/** Etapa do funil de venda: número, rótulo e valor. */
function FunnelStep({
  step,
  label,
  value,
  hint,
  done = false,
}: {
  step: number;
  label: string;
  value: string;
  hint?: string;
  done?: boolean;
}): React.ReactElement {
  return (
    <div className="min-w-0 flex-1 rounded-xl border bg-card p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
            done
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-primary/10 text-primary'
          }`}
          aria-hidden
        >
          {step}
        </span>
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`mt-1 truncate text-lg font-semibold tabular-nums ${
          done ? 'text-emerald-700 dark:text-emerald-400' : ''
        }`}
        title={value}
      >
        {value}
      </p>
      {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function offerValueCents(o: MyOffer): number {
  return o.askingPriceCents != null ? Number(o.askingPriceCents) * Number(o.quantitySacks) : 0;
}

export default async function ProducaoPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.organizationType !== 'producer') redirect('/mercado');

  const [overview, suggestions, offers] = await Promise.all([
    apiFetch<FieldOverview>('/field-data/overview'),
    apiFetch<SuggestionsResult>('/ai/suggest-contracts', { method: 'POST', body: JSON.stringify({}) }),
    apiFetch<MyOffer[]>('/offers/mine'),
  ]);

  // Funil de venda: pronto para vender → no mercado → vendido
  const readySacks = overview.crops
    .filter((c) => c.status === 'disponivel' && c.availableSacks != null)
    .reduce((s, c) => s + (c.availableSacks ?? 0), 0);
  const openOffers = offers.filter((o) => o.status === 'disponivel' || o.status === 'em_negociacao');
  const soldOffers = offers.filter((o) => o.status === 'contratada');
  const openOffersValueCents = openOffers.reduce((s, o) => s + offerValueCents(o), 0);
  const soldValueCents = soldOffers.reduce((s, o) => s + offerValueCents(o), 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      <main className="container max-w-3xl animate-fade-up py-6 lg:max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">Minha produção</h1>
        <p className="text-sm text-muted-foreground">
          Você escolhe o que vender — os dados já chegam prontos do campo.
        </p>

        {/* Funil de venda em um relance: colheita → mercado → contrato */}
        <div className="mt-4 flex items-stretch gap-1.5 sm:gap-2">
          <FunnelStep
            step={1}
            label="Pronto para vender"
            value={`${formatSacks(String(readySacks))} sc`}
          />
          <ChevronRight className="mt-8 h-4 w-4 shrink-0 self-start text-muted-foreground/50 sm:mt-9" aria-hidden />
          <FunnelStep
            step={2}
            label="No mercado"
            value={openOffers.length === 0 ? '—' : formatMoney(String(openOffersValueCents))}
            hint={
              openOffers.length > 0
                ? `${openOffers.length} ${openOffers.length === 1 ? 'oferta' : 'ofertas'}`
                : undefined
            }
          />
          <ChevronRight className="mt-8 h-4 w-4 shrink-0 self-start text-muted-foreground/50 sm:mt-9" aria-hidden />
          <FunnelStep
            step={3}
            label="Vendido"
            value={soldOffers.length === 0 ? '—' : formatMoney(String(soldValueCents))}
            hint={
              soldOffers.length > 0
                ? `${soldOffers.length} ${soldOffers.length === 1 ? 'contrato' : 'contratos'}`
                : undefined
            }
            done={soldOffers.length > 0}
          />
        </div>

        {/* Zona principal (o que vender) + coluna lateral (o que já foi ofertado) */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProductionBoard
              suggestions={suggestions.suggestions}
              aiEnabled={suggestions.enabled}
              crops={overview.crops}
            />
          </div>

          <aside className="space-y-6">
            {/* Minhas ofertas */}
            <section>
              <h2 className="mb-3 font-semibold">Minhas ofertas</h2>
              {offers.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/50 p-4 text-sm text-muted-foreground">
                  <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden />
                  Você ainda não disponibilizou nenhum lote para venda.
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((o) => {
                    const grain = GRAIN_LABELS[o.grainType];
                    const totalCents = offerValueCents(o);
                    return (
                      <div key={o.id} className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <GrainChip grain={o.grainType} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">
                                {formatSacks(o.quantitySacks)} sacas de {grain.label}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  o.status === 'contratada'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : o.status === 'disponivel'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                                      : 'bg-muted'
                                }`}
                              >
                                {o.status === 'contratada' ? 'Vendida' : o.status === 'disponivel' ? 'No mercado' : o.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {o.askingPriceCents
                                ? `${formatMoney(o.askingPriceCents)}/saca · total ${formatMoney(String(totalCents))} · `
                                : ''}
                              {o.contract ? (
                                <Link href={`/contracts/${o.contract.id}`} className="text-primary hover:underline">
                                  virou contrato {o.contract.contractNumber}
                                </Link>
                              ) : (
                                'aguardando uma cooperativa'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Premissa: dados coletados automaticamente */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Satellite className="h-4 w-4 text-primary" aria-hidden />
                Coletado automaticamente
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A Plantor integra os dados das máquinas e sensores da sua fazenda. Você não digita
                produtividade, umidade ou clima — só confirma o que quer vender.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTEGRATIONS.map((i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
