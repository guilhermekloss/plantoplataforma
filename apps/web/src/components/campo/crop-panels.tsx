import Link from 'next/link';
import {
  CircleAlert,
  FlaskConical,
  Leaf,
  NotebookPen,
  Satellite,
  ThermometerSun,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { BlockTitle, Metric } from '@/components/campo/metric';
import { Sparkline } from '@/components/campo/sparkline';
import { formatDate, formatMoney } from '@/lib/contracts';
import { OPERATION_META, type CropTelemetry } from '@/lib/field-data';

/** NDVI de satélite: curva do ciclo e, para lavoura em desenvolvimento, a estimativa pré-colheita. */
export function SatellitePanel({ crop }: { crop: CropTelemetry }): React.ReactElement | null {
  const sat = crop.satellite;
  if (!sat || sat.ndviSeries.length < 2) return null;
  const growing = crop.status === 'em_desenvolvimento';
  const last = sat.ndviSeries[sat.ndviSeries.length - 1]!;
  const first = sat.ndviSeries[0]!;
  return (
    <div>
      <BlockTitle icon={Satellite}>Satélite (NDVI)</BlockTitle>
      <div className="mt-2 rounded-lg border bg-card p-3">
        <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Pico <strong className="text-foreground">{sat.peakNdvi.toFixed(2)}</strong>
          </span>
          <span>
            Última leitura <strong className="text-foreground">{last.ndvi.toFixed(2)}</strong> ·{' '}
            {formatDate(`${last.date}T12:00:00.000Z`)}
          </span>
        </div>
        <Sparkline
          className="mt-2"
          values={sat.ndviSeries.map((p) => p.ndvi)}
          min={0}
          max={1}
          strokeClassName="stroke-green-600"
          fillClassName="fill-green-600/10"
          label={`Curva de NDVI de ${formatDate(`${first.date}T12:00:00.000Z`)} a ${formatDate(`${last.date}T12:00:00.000Z`)}, pico ${sat.peakNdvi.toFixed(2)}`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatDate(`${first.date}T12:00:00.000Z`)}</span>
          <span>{formatDate(`${last.date}T12:00:00.000Z`)}</span>
        </div>
      </div>
      {growing && sat.estimatedYieldSacksPerHa != null ? (
        <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
          <p>
            Estimativa pré-colheita: <strong>{sat.estimatedYieldSacksPerHa} sc/ha</strong>
            {sat.yieldRangeSacksPerHa
              ? ` (faixa ${sat.yieldRangeSacksPerHa.min}–${sat.yieldRangeSacksPerHa.max})`
              : ''}{' '}
            · ≈ {Math.round(sat.estimatedYieldSacksPerHa * crop.areaHa).toLocaleString('pt-BR')} sacas
            na área.
          </p>
          <p className="mt-1 text-xs opacity-80">{sat.note}</p>
          <Link
            href="/producao"
            className="mt-1.5 inline-block text-xs font-medium underline underline-offset-2"
          >
            Ver sugestão de oferta antecipada
          </Link>
        </div>
      ) : null}
      <p className="mt-1.5 text-xs text-muted-foreground">Fonte: {sat.source}.</p>
    </div>
  );
}

export function OperationsTimeline({ crop }: { crop: CropTelemetry }): React.ReactElement | null {
  if (!crop.operations || crop.operations.length === 0) return null;
  const totalCents = crop.operations.reduce((s, o) => s + (o.costCentsPerHa ?? 0), 0);
  return (
    <div>
      <BlockTitle icon={NotebookPen}>Caderno de campo</BlockTitle>
      <ol className="mt-2 space-y-1.5">
        {crop.operations.map((op, i) => {
          const meta = OPERATION_META[op.type] ?? OPERATION_META.outro;
          return (
            <li key={i} className="flex items-baseline gap-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {formatDate(`${op.date}T12:00:00.000Z`)}
              </span>
              <meta.icon
                className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground"
                aria-label={meta.label}
              />
              <span className="min-w-0 flex-1">
                {op.product}
                {op.dosePerHa != null && op.unit ? (
                  <span className="text-muted-foreground">
                    {' '}
                    · {op.dosePerHa.toLocaleString('pt-BR')} {op.unit}
                  </span>
                ) : null}
              </span>
              {op.costCentsPerHa != null ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatMoney(String(op.costCentsPerHa))}/ha
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {crop.operations.length} operações registradas automaticamente · custo operacional somado{' '}
        {formatMoney(String(totalCents))}/ha
      </p>
    </div>
  );
}

export function SoilPanel({ crop }: { crop: CropTelemetry }): React.ReactElement {
  const s = crop.soilAnalysis;
  return (
    <div>
      <BlockTitle icon={Leaf}>Solo / vegetação</BlockTitle>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Metric label="NDVI médio" value={crop.ndviAvg != null ? crop.ndviAvg.toFixed(2) : '—'} />
        <Metric
          label="Umidade do solo"
          value={crop.soilMoisturePct != null ? `${crop.soilMoisturePct}%` : '—'}
        />
        <Metric label="pH do solo" value={crop.soilPh != null ? String(crop.soilPh) : '—'} />
        <Metric
          label="População"
          value={
            crop.plantPopulationPerHa != null
              ? `${crop.plantPopulationPerHa.toLocaleString('pt-BR')}/ha`
              : '—'
          }
        />
      </div>
      {s ? (
        <div className="mt-2 rounded-md border bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            <span>
              P: <strong>{s.pPpm ?? '—'} ppm</strong>
            </span>
            <span>
              K: <strong>{s.kCmolDm3 ?? '—'} cmolc/dm³</strong>
            </span>
            <span>
              M.O.: <strong>{s.organicMatterPct ?? '—'}%</strong>
            </span>
            <span>
              CTC: <strong>{s.ctcCmolDm3 ?? '—'}</strong>
            </span>
            <span>
              V%: <strong>{s.baseSaturationPct ?? '—'}%</strong>
            </span>
          </div>
          {s.recommendation ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                <strong>Recomendação:</strong> {s.recommendation}
              </span>
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {s.labName}
            {s.sampleDate ? ` · amostra de ${formatDate(`${s.sampleDate}T12:00:00.000Z`)}` : ''}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function StoragePanel({ crop }: { crop: CropTelemetry }): React.ReactElement | null {
  const s = crop.storage;
  if (!s) return null;
  return (
    <div>
      <BlockTitle icon={Warehouse}>Armazenagem</BlockTitle>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Metric label="Silo" value={s.siloName ?? '—'} />
        <Metric
          label="Temp. do grão"
          value={s.grainTempC != null ? `${s.grainTempC}°C` : '—'}
          hint={s.tempAlert ? '⚠ acima do seguro (30°C)' : undefined}
        />
        <Metric label="Aeração" value={s.aerationOn == null ? '—' : s.aerationOn ? 'Ligada' : 'Desligada'} />
        <Metric
          label="Capacidade"
          value={s.capacitySacks != null ? `${s.capacitySacks.toLocaleString('pt-BR')} sc` : '—'}
        />
      </div>
      {s.telemetry && s.telemetry.history.length >= 2 ? <SiloTelemetryChart crop={crop} /> : null}
      {crop.storageRisk ? (
        <div
          role="alert"
          className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <p className="flex items-center gap-1.5 font-semibold">
            <CircleAlert className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            Desconto estimado de {formatMoney(String(crop.storageRisk.estDiscountCents))} no{' '}
            {crop.storageRisk.contractNumber}
          </p>
          <p className="mt-1 text-xs">
            Umidade projetada na entrega ({formatDate(crop.storageRisk.deliveryDeadline)}):{' '}
            <strong>{crop.storageRisk.projectedMoisturePct.toLocaleString('pt-BR')}%</strong> — o
            contrato admite até {crop.storageRisk.maxMoisturePct.toLocaleString('pt-BR')}% (desconto de{' '}
            {crop.storageRisk.discountPct.toLocaleString('pt-BR')}%). Acione a aeração ou antecipe a
            entrega.
          </p>
          <Link
            href={`/contracts/${crop.storageRisk.contractId}`}
            className="mt-1.5 inline-block text-xs font-medium underline underline-offset-2"
          >
            Abrir o contrato
          </Link>
        </div>
      ) : s.tempAlert ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>
            Massa de grãos aquecida — risco de fungos e desconto de qualidade na venda. A aeração
            está {s.aerationOn ? 'ligada; acompanhe a queda de temperatura' : 'desligada; ligue-a'}.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Termometria dos últimos dias: temperatura da massa de grãos e tendência. */
function SiloTelemetryChart({ crop }: { crop: CropTelemetry }): React.ReactElement | null {
  const t = crop.storage?.telemetry;
  if (!t) return null;
  const temps = t.history.map((h) => h.grainTempC);
  const lastMoisture = [...t.history].reverse().find((h) => h.intergranularMoisturePct != null);
  const warming = t.trend.warming;
  return (
    <div className="mt-2 rounded-lg border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ThermometerSun className="h-3.5 w-3.5" aria-hidden />
          Termometria · {t.history.length} dias
        </span>
        <span className={warming ? 'font-medium text-red-700 dark:text-red-400' : undefined}>
          {t.trend.tempCPerDay > 0 ? '+' : ''}
          {t.trend.tempCPerDay.toLocaleString('pt-BR')}°C/dia
          {warming ? ' · aquecendo' : ''}
        </span>
      </div>
      <Sparkline
        className="mt-2"
        values={temps}
        strokeClassName={warming ? 'stroke-red-600' : 'stroke-sky-600'}
        fillClassName={warming ? 'fill-red-600/10' : 'fill-sky-600/10'}
        label={`Temperatura da massa de grãos nos últimos ${t.history.length} dias, de ${temps[0]}°C a ${temps[temps.length - 1]}°C`}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {temps[0]?.toLocaleString('pt-BR')}°C → {temps[temps.length - 1]?.toLocaleString('pt-BR')}°C
        {lastMoisture?.intergranularMoisturePct != null
          ? ` · umidade intergranular ${lastMoisture.intergranularMoisturePct.toLocaleString('pt-BR')}%`
          : ''}
        {' '}— {t.source}.
      </p>
    </div>
  );
}

export function CostPanel({ crop }: { crop: CropTelemetry }): React.ReactElement | null {
  const cost = crop.productionCost;
  const d = crop.decision;
  if (!cost?.totalCostCentsPerHa) return null;
  const b = cost.breakdown ?? {};
  const items: { label: string; cents: number | undefined }[] = [
    { label: 'Sementes', cents: b.seedsCents },
    { label: 'Fertilizantes', cents: b.fertilizerCents },
    { label: 'Defensivos', cents: b.chemicalsCents },
    { label: 'Operações', cents: b.operationsCents },
    { label: 'Outros', cents: b.otherCents },
  ];
  return (
    <div>
      <BlockTitle icon={Wallet}>Custo e decisão</BlockTitle>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Metric label="Custo total" value={`${formatMoney(String(cost.totalCostCentsPerHa))}/ha`} />
        <Metric
          label="Custo por saca"
          value={d?.breakEvenCentsPerSack != null ? formatMoney(String(d.breakEvenCentsPerSack)) : '—'}
          hint="break-even"
        />
        <Metric
          label="Preço hoje"
          value={d?.marketPriceCents != null ? formatMoney(String(d.marketPriceCents)) : '—'}
        />
        <Metric
          label="Margem por saca"
          value={
            d?.marginCentsPerSack != null
              ? `${formatMoney(String(d.marginCentsPerSack))}${d.marginPct != null ? ` (${d.marginPct}%)` : ''}`
              : '—'
          }
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {items
          .filter((i) => i.cents != null)
          .map((i) => `${i.label} ${formatMoney(String(i.cents))}`)
          .join(' · ')}
        {cost.source ? ` — fonte: ${cost.source}` : ''}
      </p>
    </div>
  );
}
