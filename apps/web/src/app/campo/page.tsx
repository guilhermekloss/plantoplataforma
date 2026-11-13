import { redirect } from 'next/navigation';
import { CloudSun, Tractor, TrendingUp } from 'lucide-react';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/server-api';
import { AppHeader } from '@/components/app-header';
import { GrainChip } from '@/components/grain-icon';
import { PricingEstimator } from '@/components/pricing-estimator';
import { BlockTitle, Metric } from '@/components/campo/metric';
import { SellDecisionPanel } from '@/components/campo/sell-decision-panel';
import { ClimateMonitorPanel } from '@/components/campo/climate-monitor-panel';
import { LivestockPanel } from '@/components/campo/livestock-panel';
import { CostPanel, OperationsTimeline, SoilPanel, StoragePanel } from '@/components/campo/crop-panels';
import { GRAIN_LABELS, formatMoney } from '@/lib/contracts';
import type { FieldOverview } from '@/lib/field-data';

const PERIOD_LABEL: Record<string, string> = {
  primeira: '1ª safra',
  segunda: '2ª safra (safrinha)',
  unica: 'safra única',
};

export default async function CampoPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');

  const data = await apiFetch<FieldOverview>('/field-data/overview');

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      <main className="container max-w-3xl animate-fade-up py-6 lg:max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">Meu campo</h1>
        <p className="text-sm text-muted-foreground">
          Tudo que a fazenda envia — máquinas, solo, clima, silo e custos — reunido para você
          decidir na hora certa.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Fazenda" value={data.farm.name ?? '—'} hint={data.farm.region} />
          <Metric
            label="Área"
            value={`${data.farm.hectares.toLocaleString('pt-BR')} ha`}
            hint={
              data.farm.landUse
                ? [
                    data.farm.landUse.arableHa != null
                      ? `${data.farm.landUse.arableHa.toLocaleString('pt-BR')} lavoura`
                      : null,
                    data.farm.landUse.pastureHa != null
                      ? `${data.farm.landUse.pastureHa.toLocaleString('pt-BR')} pasto`
                      : null,
                    data.farm.landUse.reserveHa != null
                      ? `${data.farm.landUse.reserveHa.toLocaleString('pt-BR')} reserva`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : `≈ ${data.farm.alqueires.toLocaleString('pt-BR')} alqueires`
            }
          />
          <Metric label="Culturas monitoradas" value={String(data.crops.length)} />
          <Metric
            label="Receita potencial"
            value={formatMoney(String(data.totals.estimatedGrossValueCents))}
            hint="referência indicativa"
          />
        </div>

        <SellDecisionPanel overview={data} />
        <ClimateMonitorPanel overview={data} />
        <LivestockPanel overview={data} />

        {data.crops.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">
            Nenhum dado de campo recebido ainda.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <h2 className="font-semibold">Minhas lavouras</h2>
            {data.crops.map((c) => {
              const grain = GRAIN_LABELS[c.grainType];
              return (
                <section key={c.id} className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="flex items-center gap-2.5 text-lg font-semibold">
                      <GrainChip grain={c.grainType} />
                      {grain.label}
                    </h2>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {c.harvestYear} · {PERIOD_LABEL[c.harvestPeriod] ?? c.harvestPeriod}
                    </span>
                  </div>

                  {/* Duas colunas no desktop: agronômico à esquerda, operação/dinheiro à direita */}
                  <div className="lg:grid lg:grid-cols-2 lg:gap-x-10">
                    <div>
                      <BlockTitle icon={Tractor}>Colheita / máquina</BlockTitle>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <Metric label="Produtividade" value={`${c.yieldSacksPerHa} sc/ha`} />
                        <Metric label="Área" value={`${c.areaHa} ha`} />
                        <Metric
                          label="Umidade na colheita"
                          value={c.harvestMoisturePct != null ? `${c.harvestMoisturePct}%` : '—'}
                        />
                        <Metric
                          label="Perda estimada"
                          value={c.harvestLossSacksPerHa != null ? `${c.harvestLossSacksPerHa} sc/ha` : '—'}
                        />
                      </div>
                      {c.yieldMap ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Mapa de produtividade: {c.yieldMap.minSc}–{c.yieldMap.maxSc} sc/ha (média{' '}
                          {c.yieldMap.avgSc}). Fonte: {c.source}.
                        </p>
                      ) : null}

                      <SoilPanel crop={c} />

                      <BlockTitle icon={CloudSun}>Clima do ciclo</BlockTitle>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <Metric label="Chuva acumulada" value={c.climate.rainfallMmCycle != null ? `${c.climate.rainfallMmCycle} mm` : '—'} />
                        <Metric label="Graus-dia" value={c.climate.gddCycle != null ? `${c.climate.gddCycle}` : '—'} />
                        <Metric label="Temp. média" value={c.climate.avgTempC != null ? `${c.climate.avgTempC}°C` : '—'} />
                        <Metric
                          label="Geadas"
                          value={c.climate.frostEvents != null ? String(c.climate.frostEvents) : '—'}
                          hint={c.climate.frostEvents && c.climate.frostEvents > 0 ? 'atenção (trigo)' : undefined}
                        />
                      </div>
                    </div>

                    <div>
                      <OperationsTimeline crop={c} />
                      <StoragePanel crop={c} />
                      <CostPanel crop={c} />
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-1">
                    <BlockTitle icon={TrendingUp}>Potencial de receita</BlockTitle>
                    <div className="mt-2">
                      <PricingEstimator
                        yieldSacksPerHa={c.yieldSacksPerHa}
                        areaHa={c.areaHa}
                        totalSacks={c.pricing.estimatedTotalSacks}
                        indicativePriceCents={c.pricing.indicativePriceCents}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
