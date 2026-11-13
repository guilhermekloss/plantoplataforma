'use client';

import { useState, useTransition } from 'react';
import {
  ClipboardList,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Sparkles,
  Sprout,
  SprayCan,
  Tractor,
  Warehouse,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/contracts';
import type {
  GrainQuality,
  OfferEvaluation,
  OfferTraceability,
  OfferVerification,
  OfferVerdict,
  TraceabilityEvent,
} from '@/lib/offers';
import { evaluateOffer, fetchTraceability } from '@/app/mercado/actions';

const GRADE_STYLE: Record<GrainQuality['grade'], string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  B: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  C: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
};

export function QualityChip({ quality }: { quality: GrainQuality }): React.ReactElement {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${GRADE_STYLE[quality.grade]}`}
      title={`Confiança ${quality.confidence} — ${quality.source}`}
    >
      Qualidade {quality.score} · classe {quality.grade}
      {quality.confidence === 'baixa' ? ' · dados limitados' : ''}
    </span>
  );
}

export function VerificationChip({
  verification,
}: {
  verification: OfferVerification;
}): React.ReactElement {
  if (verification.level === 'sensores') {
    return (
      <span
        className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        title={`Dados de: ${verification.sources.join(', ')}`}
      >
        <ShieldCheck className="h-3 w-3" aria-hidden />
        Verificado por sensores
      </span>
    );
  }
  return (
    <span
      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
      title="Dados informados pelo produtor, sem sensoriamento anexado"
    >
      Dados declarados
    </span>
  );
}

const KIND_ICON: Record<TraceabilityEvent['kind'], typeof Sprout> = {
  plantio: Sprout,
  solo: FlaskConical,
  operacao: SprayCan,
  colheita: Tractor,
  beneficiamento: Wind,
  armazenagem: Warehouse,
};

function formatEventDate(date: string | null): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function TraceabilityPanel({ trace }: { trace: OfferTraceability }): React.ReactElement {
  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Rastreabilidade — {trace.producer.name}
          {trace.producer.city ? ` · ${trace.producer.city}` : ''} ·{' '}
          {trace.areaHa.toLocaleString('pt-BR')} ha
        </p>
        <QualityChip quality={trace.quality} />
      </div>

      <ol className="mt-3 space-y-0">
        {trace.timeline.map((ev, i) => {
          const Icon = KIND_ICON[ev.kind] ?? ClipboardList;
          const last = i === trace.timeline.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-4">
              {!last ? (
                <span className="absolute left-[13px] top-7 h-full w-px bg-border" aria-hidden />
              ) : null}
              <span
                className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-card"
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium">
                  {ev.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {formatEventDate(ev.date)}
                  </span>
                </p>
                {ev.detail ? <p className="text-xs text-muted-foreground">{ev.detail}</p> : null}
                {ev.source ? (
                  <p className="text-[11px] text-muted-foreground/70">Fonte: {ev.source}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        {trace.climateCycle.rainfallMmCycle != null ? (
          <span>
            Chuva no ciclo: {trace.climateCycle.rainfallMmCycle.toLocaleString('pt-BR')} mm
          </span>
        ) : null}
        {trace.climateCycle.avgTempC != null ? (
          <span>Temp. média: {trace.climateCycle.avgTempC.toLocaleString('pt-BR')}°C</span>
        ) : null}
        {trace.climateCycle.frostEvents != null ? (
          <span>Geadas: {trace.climateCycle.frostEvents}</span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/70">{trace.quality.source}</p>
    </div>
  );
}

const VERDICT_LABEL: Record<OfferVerdict, { label: string; className: string }> = {
  preco_justificado: {
    label: 'Preço justificado pela qualidade',
    className: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  },
  negociavel: {
    label: 'Margem para negociar',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  },
  acima_do_justo: {
    label: 'Acima do que a qualidade sustenta',
    className: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  },
  sem_preco: { label: 'Sem preço definido', className: 'bg-muted text-muted-foreground' },
};

function EvaluationPanel({ evaluation }: { evaluation: OfferEvaluation }): React.ReactElement {
  const v = VERDICT_LABEL[evaluation.verdict];
  const f = evaluation.figures;
  return (
    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm font-medium">Análise de qualidade × preço</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.className}`}>
          {v.label}
        </span>
        {!evaluation.enabled ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            análise automática
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm">{evaluation.analysis}</p>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {f.askingPriceCents != null ? (
          <span>
            Pedido:{' '}
            <strong className="text-foreground">
              {formatMoney(String(f.askingPriceCents))}/saca
            </strong>
          </span>
        ) : null}
        {f.fairPriceCents != null ? (
          <span>
            Justo p/ qualidade:{' '}
            <strong className="text-foreground">
              {formatMoney(String(f.fairPriceCents))}/saca
            </strong>
            {f.qualityAdjPct != null && f.qualityAdjPct !== 0
              ? ` (referência ${f.qualityAdjPct > 0 ? '+' : ''}${f.qualityAdjPct.toLocaleString('pt-BR')}%)`
              : ''}
          </span>
        ) : null}
        {f.referencePriceCents != null ? (
          <span>Referência: {formatMoney(String(f.referencePriceCents))}/saca</span>
        ) : null}
      </div>

      <ul className="mt-3 space-y-1 border-t pt-3">
        {evaluation.quality.factors.map((factor, i) => (
          <li key={i} className="flex items-baseline gap-2 text-xs">
            <span
              className={`shrink-0 font-semibold tabular-nums ${
                factor.deltaPts < 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-green-700 dark:text-green-400'
              }`}
            >
              {factor.deltaPts > 0
                ? `+${factor.deltaPts}`
                : factor.deltaPts === 0
                  ? '✓'
                  : factor.deltaPts}
            </span>
            <span className="text-muted-foreground">
              <strong className="font-medium text-foreground">{factor.label}.</strong>{' '}
              {factor.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Ações de análise do comprador no card da oferta: dossiê de rastreabilidade
 * (plantio → armazenagem) e avaliação IA de qualidade × preço.
 */
export function OfferInsights({ offerId }: { offerId: string }): React.ReactElement {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<'trace' | 'eval' | null>(null);
  const [trace, setTrace] = useState<OfferTraceability | null>(null);
  const [evaluation, setEvaluation] = useState<OfferEvaluation | null>(null);
  const [busy, setBusy] = useState<'trace' | 'eval' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleTrace(): void {
    setError(null);
    if (open === 'trace') return setOpen(null);
    if (trace) return setOpen('trace');
    setBusy('trace');
    startTransition(async () => {
      const res = await fetchTraceability(offerId);
      setBusy(null);
      if (!res.ok || !res.data) return setError(res.error ?? 'Erro.');
      setTrace(res.data);
      setOpen('trace');
    });
  }

  function toggleEval(): void {
    setError(null);
    if (open === 'eval') return setOpen(null);
    if (evaluation) return setOpen('eval');
    setBusy('eval');
    startTransition(async () => {
      const res = await evaluateOffer(offerId);
      setBusy(null);
      if (!res.ok || !res.data) return setError(res.error ?? 'Erro.');
      setEvaluation(res.data);
      setOpen('eval');
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={toggleTrace} disabled={pending}>
          {pending && busy === 'trace' ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ClipboardList className="mr-2 h-3.5 w-3.5" aria-hidden />
          )}
          {open === 'trace' ? 'Ocultar rastreabilidade' : 'Ver rastreabilidade'}
        </Button>
        <Button size="sm" variant="outline" onClick={toggleEval} disabled={pending}>
          {pending && busy === 'eval' ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden />
          )}
          {open === 'eval' ? 'Ocultar análise' : 'Qualidade justifica o preço?'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {open === 'trace' && trace ? <TraceabilityPanel trace={trace} /> : null}
      {open === 'eval' && evaluation ? <EvaluationPanel evaluation={evaluation} /> : null}
    </div>
  );
}
