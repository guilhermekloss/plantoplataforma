import Link from 'next/link';
import {
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CloudSun,
  Info,
  Lightbulb,
} from 'lucide-react';
import type { ContractStatus } from '@plantor/shared';
import { GrainChip } from '@/components/grain-icon';
import { SectionTitle } from '@/components/campo/metric';
import { GRAIN_LABELS, STATUS_LABELS_PRODUCER, formatDate, formatSacks } from '@/lib/contracts';
import {
  CONDITION_META,
  RISK_META,
  type ContractClimateRisk,
  type FieldOverview,
} from '@/lib/field-data';

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function weekday(iso: string): string {
  return WEEKDAY[new Date(`${iso}T12:00:00`).getDay()] ?? '';
}

function hourBr(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Card de risco climático de um contrato: score, tendência, fatores e recomendação. */
function ContractRiskCard({ risk }: { risk: ContractClimateRisk }): React.ReactElement {
  const meta = RISK_META[risk.riskLevel];
  const grain = GRAIN_LABELS[risk.grainType];
  const delta = risk.deltaVsYesterdayPts;
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/contracts/${risk.contractId}`}
          className="flex min-w-0 items-center gap-2 font-medium hover:underline"
        >
          <GrainChip grain={risk.grainType} size="sm" />
          <span className="truncate">
            {risk.contractNumber} · {grain.label}
          </span>
        </Link>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClassName}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
        {formatSacks(String(risk.remainingSacks))} sacas até {formatDate(risk.deliveryDeadline)} (
        {risk.daysToDeadline} dias) ·{' '}
        {STATUS_LABELS_PRODUCER[risk.contractStatus as ContractStatus] ?? risk.contractStatus}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${meta.barClassName}`}
            style={{ width: `${Math.max(risk.riskScorePct, 3)}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums">{risk.riskScorePct}/100</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
            delta > 0
              ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              : delta < 0
                ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {delta > 0 ? `▲ +${delta} pts` : delta < 0 ? `▼ ${delta} pts` : 'estável'} vs. ontem
        </span>
      </div>
      <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
        {risk.drivers.map((d, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
            <span>{d}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-start gap-1.5 border-t pt-3 text-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>{risk.recommendation}</span>
      </p>
    </div>
  );
}

export function ClimateMonitorPanel({ overview }: { overview: FieldOverview }): React.ReactElement {
  const w = overview.weather;
  const ai = overview.climate;
  const outlook = ai.rainOutlook;
  // Alertas emitidos pela análise ficam de fora: o card completo aparece logo abaixo.
  const alerts = w.alerts.filter((a) => a.source !== 'ia');
  return (
    <section className="mt-6">
      <SectionTitle icon={BrainCircuit}>Clima & risco dos contratos</SectionTitle>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
        <span className="flex items-center gap-2 font-medium text-emerald-700">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Monitoramento contínuo
        </span>
        <span>
          análise das {hourBr(ai.engine.updatedAt)} · próxima às {hourBr(ai.engine.nextRunAt)}
        </span>
        <span>
          {ai.engine.dataPointsAnalyzed.toLocaleString('pt-BR')} leituras de {ai.engine.sources.length}{' '}
          fontes
        </span>
        <span>confiança {ai.engine.confidencePct}%</span>
      </div>

      {alerts.length > 0 ? (
        <div className="mt-3 space-y-2">
          {alerts.map((a, i) => {
            const Icon = a.level === 'info' ? Info : CircleAlert;
            return (
              <p
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  a.level === 'urgente'
                    ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                    : a.level === 'atencao'
                      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    a.level === 'urgente' ? 'text-red-600' : a.level === 'atencao' ? 'text-amber-600' : 'text-blue-600'
                  }`}
                  aria-hidden
                />
                <span className="flex-1">
                  {a.message}
                  {a.action === 'criar_oferta' ? (
                    <>
                      {' '}
                      <Link href="/producao" className="font-semibold underline underline-offset-2">
                        Criar oferta em Produção →
                      </Link>
                    </>
                  ) : null}
                </span>
              </p>
            );
          })}
        </div>
      ) : null}

      {ai.contractRisks.length > 0 ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {ai.contractRisks.map((r) => (
            <ContractRiskCard key={r.contractId} risk={r} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed bg-card/50 p-4 text-sm text-muted-foreground">
          Nenhum contrato com prazo de entrega em aberto. Assim que houver um compromisso, a IA passa
          a cruzá-lo com a previsão e projeta o risco aqui.
        </p>
      )}

      {ai.insights.length > 0 ? (
        <div className="mt-3 space-y-2">
          {ai.insights.map((ins, i) => {
            const InsIcon = ins.severity === 'info' ? Info : CircleAlert;
            return (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  ins.severity === 'urgente'
                    ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                    : ins.severity === 'atencao'
                      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                }`}
              >
                <InsIcon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    ins.severity === 'urgente'
                      ? 'text-red-600'
                      : ins.severity === 'atencao'
                        ? 'text-amber-600'
                        : 'text-blue-600'
                  }`}
                  aria-hidden
                />
                <span>
                  <strong className="font-medium">{ins.title}.</strong> {ins.detail}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <h3 className="mb-2 mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <CloudSun className="h-4 w-4" aria-hidden />
        Previsão que alimenta a análise · próximos 7 dias
      </h3>
      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] gap-2">
          {w.days.map((d) => {
            const meta = CONDITION_META[d.condition];
            return (
              <div key={d.date} className="flex-1 rounded-lg border bg-card p-2 text-center shadow-sm">
                <p className="text-xs font-medium">{weekday(d.date)}</p>
                <meta.icon
                  className={`mx-auto my-1 h-5 w-5 ${meta.className}`}
                  aria-label={meta.label}
                />
                <p className="text-xs tabular-nums">
                  <span className="font-semibold">{d.tMaxC}°</span>
                  <span className="text-muted-foreground"> / {d.tMinC}°</span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {d.rainMm > 0 ? `${d.rainMm} mm` : `${d.rainProbPct}%`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      {w.dryWindow ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
          <span>
            Janela seca de <strong>{w.dryWindow.days} dias</strong> a partir de{' '}
            {formatDate(`${w.dryWindow.startDate}T12:00:00.000Z`)} — bom período para colheita e
            aplicações.
          </span>
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        Chuva projetada: {outlook.next7dMm} mm em 7 dias · {outlook.next15dMm} mm em 15 dias (
        {outlook.anomalyPct > 0 ? '+' : ''}
        {outlook.anomalyPct}% vs. média de {outlook.monthLabel})
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {w.station} · {ai.engine.sources.slice(1).join(' · ')} · {ai.engine.note}
      </p>
    </section>
  );
}
