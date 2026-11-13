import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { apiFetch, ApiRequestError } from '@/lib/server-api';
import { AppHeader } from '@/components/app-header';
import { GrainChip } from '@/components/grain-icon';
import { StatusBadge } from '@/components/status-badge';
import { ContractActions } from '@/components/contract-actions';
import { ContractExplainer } from '@/components/contract-explainer';
import { ContractTimeline } from '@/components/contract-timeline';
import { DeliveriesSection } from '@/components/deliveries-section';
import {
  GRAIN_LABELS,
  PRICE_TYPE_LABELS,
  QUALITY_ADJ_LABELS,
  formatDate,
  formatMoney,
  formatSacks,
  type Contract,
  type ContractEvent,
  type Delivery,
} from '@/lib/contracts';
import { TraceabilityPanel } from '@/components/offer-insights';
import type { OfferTraceability } from '@/lib/offers';

function Field({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <dl className="divide-y">{children}</dl>
    </section>
  );
}

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');

  let contract: Contract;
  let events: ContractEvent[];
  let deliveries: Delivery[];
  try {
    [contract, events, deliveries] = await Promise.all([
      apiFetch<Contract>(`/contracts/${params.id}`),
      apiFetch<ContractEvent[]>(`/contracts/${params.id}/events`),
      apiFetch<Delivery[]>(`/deliveries?contractId=${params.id}`),
    ]);
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  const orgId = session.user.organizationId;
  const isBuyer = contract.buyerId === orgId;
  const isSeller = contract.sellerId === orgId;

  // Rastreabilidade do lote (quando o contrato nasceu de uma oferta do Mercado).
  // Só o comprador tem a rota; contratos manuais respondem 404 — segue sem a seção.
  let traceability: OfferTraceability | null = null;
  if (isBuyer) {
    try {
      traceability = await apiFetch<OfferTraceability>(
        `/offers/by-contract/${params.id}/traceability`,
      );
    } catch (err) {
      if (!(err instanceof ApiRequestError && (err.status === 404 || err.status === 403)))
        throw err;
    }
  }
  const audience = isSeller ? 'producer' : 'buyer';

  const buyerSigned = contract.signatures?.some((s) => s.signerRole === 'buyer') ?? false;
  const sellerSigned = contract.signatures?.some((s) => s.signerRole === 'seller') ?? false;

  const canSubmit = isBuyer && contract.status === 'rascunho';
  const canSign =
    (isBuyer && contract.status === 'pendente_assinatura_comprador' && !buyerSigned) ||
    (isSeller && contract.status === 'pendente_assinatura_produtor' && !sellerSigned);
  const canDispute =
    (isBuyer || isSeller) &&
    ['assinado', 'em_execucao', 'entregue_parcial'].includes(contract.status);
  const canCancel = isBuyer && !['liquidado', 'cancelado'].includes(contract.status);

  const grain = GRAIN_LABELS[contract.grainType];
  const totalCents =
    contract.priceValueCents != null
      ? String(Number(contract.priceValueCents) * Number(contract.quantitySacks))
      : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      <main className="container max-w-3xl py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <GrainChip grain={contract.grainType} />
            <div>
              <h1 className="text-2xl font-semibold">{contract.contractNumber}</h1>
              <p className="text-sm text-muted-foreground">{grain.label}</p>
            </div>
          </div>
          <StatusBadge status={contract.status} audience={audience} />
        </div>

        <div className="mt-6">
          <ContractActions
            contractId={contract.id}
            canSubmit={canSubmit}
            canSign={canSign}
            canDispute={canDispute}
            canCancel={canCancel}
          />
        </div>

        <div className="mt-6">
          <ContractExplainer contractId={contract.id} />
        </div>

        <div className="mt-6 grid gap-4">
          <Section title="Partes">
            <Field label="Comprador" value={contract.buyer?.name ?? '—'} />
            <Field label="Produtor" value={contract.seller?.name ?? '—'} />
          </Section>

          <Section title="Objeto">
            <Field label="Grão" value={grain.label} />
            <Field label="Quantidade" value={`${formatSacks(contract.quantitySacks)} sacas`} />
            <Field label="Peso da saca" value={`${contract.sackWeightKg} kg`} />
            <Field label="Safra" value={`${contract.harvestYear} · ${contract.harvestPeriod}`} />
          </Section>

          <Section title="Qualidade (MAPA)">
            <Field label="Umidade máx" value={`${contract.maxMoisturePct}%`} />
            <Field label="Impurezas máx" value={`${contract.maxImpurityPct}%`} />
            {contract.minSpecificWeightGL ? (
              <Field label="PH mín" value={`${contract.minSpecificWeightGL} g/L`} />
            ) : null}
            {contract.maxDamagedPct ? (
              <Field label="Avariados máx" value={`${contract.maxDamagedPct}%`} />
            ) : null}
            <Field
              label="Ajuste por não conformidade"
              value={QUALITY_ADJ_LABELS[contract.qualityAdjType] ?? contract.qualityAdjType}
            />
          </Section>

          <Section title="Preço">
            <Field
              label="Tipo"
              value={PRICE_TYPE_LABELS[contract.priceType] ?? contract.priceType}
            />
            <Field
              label="Valor por saca"
              value={formatMoney(contract.priceValueCents, contract.priceCurrency)}
            />
            <Field label="Total estimado" value={formatMoney(totalCents, contract.priceCurrency)} />
            {contract.advancePct ? (
              <Field label="Adiantamento" value={`${contract.advancePct}%`} />
            ) : null}
          </Section>

          <Section title="Entrega e penalidades">
            <Field label="Armazém" value={contract.warehouseName} />
            <Field
              label="Local"
              value={`${contract.warehouseAddress?.city ?? ''}/${contract.warehouseAddress?.state ?? ''}`}
            />
            <Field label="Entrega até" value={formatDate(contract.deliveryDeadline)} />
            <Field
              label="Frete"
              value={contract.transportResponsible === 'seller' ? 'Produtor' : 'Comprador'}
            />
            <Field label="Cláusula penal" value={`${contract.penaltyPct}%`} />
            <Field label="Wash out" value={contract.hasWashoutClause ? 'Sim' : 'Não'} />
            <Field label="Força maior" value={contract.hasForceMajeure ? 'Sim' : 'Não'} />
          </Section>

          {contract.contractHash ? (
            <Section title="Integridade jurídica">
              <Field
                label="Hash SHA-256 (JSON canônico)"
                value={<code className="break-all text-xs">{contract.contractHash}</code>}
              />
              {contract.signatures?.map((s) => (
                <Field
                  key={s.id}
                  label={`Assinatura ${s.signerRole === 'buyer' ? 'comprador' : 'produtor'}`}
                  value={`${formatDate(s.signedAt)} · IP ${s.ipAddress}`}
                />
              ))}
            </Section>
          ) : null}

          {traceability ? (
            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-1 font-semibold">Rastreabilidade do lote</h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Histórico completo da produção por trás deste contrato — do plantio à armazenagem,
                consolidado automaticamente pela Plantor.
              </p>
              <TraceabilityPanel trace={traceability} />
            </section>
          ) : null}

          {contract.agronomicData ? (
            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-1 font-semibold">Dados de campo (IoT) e clima</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Recebidos de máquinas e estação meteorológica
                {contract.agronomicData.source ? ` · ${contract.agronomicData.source}` : ''}.
              </p>
              <dl className="divide-y">
                {contract.agronomicData.expectedYieldSacksPerHa != null ? (
                  <Field
                    label="Produtividade esperada"
                    value={`${contract.agronomicData.expectedYieldSacksPerHa} sc/ha`}
                  />
                ) : null}
                {contract.agronomicData.areaHa != null ? (
                  <Field label="Área monitorada" value={`${contract.agronomicData.areaHa} ha`} />
                ) : null}
                {contract.agronomicData.ndviAvg != null ? (
                  <Field label="NDVI médio" value={contract.agronomicData.ndviAvg.toFixed(2)} />
                ) : null}
                {contract.agronomicData.climate?.rainfallMmCycle != null ? (
                  <Field
                    label="Chuva no ciclo"
                    value={`${contract.agronomicData.climate.rainfallMmCycle} mm`}
                  />
                ) : null}
                {contract.agronomicData.climate?.avgTempC != null ? (
                  <Field
                    label="Temp. média"
                    value={`${contract.agronomicData.climate.avgTempC}°C`}
                  />
                ) : null}
                {contract.agronomicData.climate?.frostEvents != null ? (
                  <Field
                    label="Geadas no ciclo"
                    value={String(contract.agronomicData.climate.frostEvents)}
                  />
                ) : null}
                {contract.agronomicData.reference?.estimatedGrossValueCents != null ? (
                  <Field
                    label="Receita potencial (referência)"
                    value={formatMoney(
                      String(contract.agronomicData.reference.estimatedGrossValueCents),
                    )}
                  />
                ) : null}
              </dl>
              {contract.agronomicData.reference?.note ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {contract.agronomicData.reference.note}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">Entregas</h2>
            <DeliveriesSection
              contractId={contract.id}
              totalSacks={Number(contract.quantitySacks)}
              pricePerSackCents={
                contract.priceValueCents != null ? Number(contract.priceValueCents) : null
              }
              currency={contract.priceCurrency}
              quality={{
                grainType: contract.grainType,
                maxMoisturePct: Number(contract.maxMoisturePct),
                maxImpurityPct: Number(contract.maxImpurityPct),
                minSpecificWeightGL:
                  contract.minSpecificWeightGL != null
                    ? Number(contract.minSpecificWeightGL)
                    : null,
                maxDamagedPct:
                  contract.maxDamagedPct != null ? Number(contract.maxDamagedPct) : null,
                qualityAdjType: contract.qualityAdjType,
              }}
              deliveries={deliveries}
              isBuyer={isBuyer}
              contractActive={['em_execucao', 'entregue_parcial'].includes(contract.status)}
            />
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">Histórico</h2>
            <ContractTimeline events={events} />
          </section>
        </div>
      </main>
    </div>
  );
}
