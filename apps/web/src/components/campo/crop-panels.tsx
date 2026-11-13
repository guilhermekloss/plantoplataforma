import { CircleAlert, FlaskConical, Leaf, NotebookPen, Wallet, Warehouse } from 'lucide-react';
import { BlockTitle, Metric } from '@/components/campo/metric';
import { formatDate, formatMoney } from '@/lib/contracts';
import { OPERATION_META, type CropTelemetry } from '@/lib/field-data';

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
      {s.tempAlert ? (
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
