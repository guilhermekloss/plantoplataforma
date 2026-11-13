import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  HandCoins,
  MapPin,
  MessageCircle,
  PenLine,
  Satellite,
  ShoppingCart,
  Sparkles,
  Sprout,
  TrendingUp,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/server-api';
import { AppHeader } from '@/components/app-header';
import { StatusBadge } from '@/components/status-badge';
import { StatusDonut } from '@/components/dashboard/status-donut';
import { GrainChip } from '@/components/grain-icon';
import { KpiCard } from '@/components/kpi-card';
import type { AlertLevel, DashboardSummary } from '@/lib/dashboard';
import { GRAIN_LABELS, formatDate, formatMoney, formatSacks } from '@/lib/contracts';
import { formatMoneyCompact } from '@/lib/format';
import type { FieldOverview } from '@/lib/field-data';

const ALERT_ICONS: Record<AlertLevel, { icon: LucideIcon; label: string; className: string; iconClassName: string }> = {
  urgente: {
    icon: CircleAlert,
    label: 'Urgente',
    className: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
    iconClassName: 'text-red-600',
  },
  atencao: {
    icon: CircleAlert,
    label: 'Atenção',
    className: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    iconClassName: 'text-amber-600',
  },
  pendente: {
    icon: Clock3,
    label: 'Pendente',
    className: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40',
    iconClassName: 'text-blue-600',
  },
  acao: {
    icon: CheckCircle2,
    label: 'Ação',
    className: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40',
    iconClassName: 'text-green-600',
  },
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
}

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');

  const isProducer = session.user.organizationType === 'producer';
  const [summary, overview] = await Promise.all([
    apiFetch<DashboardSummary>('/dashboard/summary'),
    isProducer ? apiFetch<FieldOverview>('/field-data/overview') : Promise.resolve(null),
  ]);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      {summary.orgType === 'producer' && overview ? (
        <ProducerDashboard summary={summary} overview={overview} name={session.user.name} />
      ) : (
        <BuyerDashboard summary={summary} />
      )}
    </div>
  );
}

function BuyerDashboard({ summary }: { summary: DashboardSummary }): React.ReactElement {
  const openOffers = summary.buyer.openMarketOffers;
  return (
    <main className="container animate-fade-up py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">Sua operação de compra em um relance.</p>
        </div>
        <Link
          href="/mercado"
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          Ofertas de produtores
          {openOffers > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {openOffers}
            </span>
          ) : null}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Contratos ativos"
          value={String(summary.kpis.activeContracts)}
          icon={FileText}
        />
        <KpiCard
          label="Sacas no mês"
          value={formatSacks(String(summary.kpis.committedSacksMonth))}
          hint="comprometidas em contratos"
          icon={Truck}
        />
        <KpiCard
          label="Valor em aberto"
          value={formatMoneyCompact(summary.kpis.openValueCents)}
          fullValue={formatMoney(summary.kpis.openValueCents)}
          icon={Wallet}
        />
        <KpiCard
          label="Entregas ≤ 30 dias"
          value={String(summary.kpis.deliveriesDue30)}
          icon={CalendarClock}
        />
      </div>

      {/* Feed operacional à esquerda (2/3), analíticos à direita (1/3) */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
        <section>
          <h2 className="mb-3 font-semibold">Alertas</h2>
          {summary.alerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/50 p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
              Nenhum alerta no momento — tudo em dia.
            </div>
          ) : (
            <ul className="space-y-2">
              {summary.alerts.map((a, i) => {
                const s = ALERT_ICONS[a.level];
                return (
                  <li key={`${a.contractId}-${i}`}>
                    <Link
                      href={`/contracts/${a.contractId}`}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-shadow hover:shadow-md ${s.className}`}
                    >
                      <s.icon className={`h-5 w-5 shrink-0 ${s.iconClassName}`} aria-hidden />
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground">
                        {a.message} · {a.contractNumber}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Últimos contratos</h2>
            <Link
              href="/contracts"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <RecentList summary={summary} audience="buyer" />
        </section>
        </div>

        <div className="space-y-6">
          {summary.buyer.purchasesByGrain.length > 0 ? (
            <section>
              <h2 className="mb-3 font-semibold">Preço médio pago vs. referência</h2>
              <div className="rounded-xl border bg-card shadow-sm">
                <ul className="divide-y">
                  {summary.buyer.purchasesByGrain.map((g) => {
                    const grain = GRAIN_LABELS[g.grainType];
                    const delta =
                      g.avgPriceCents != null && g.refPriceCents != null
                        ? g.avgPriceCents - g.refPriceCents
                        : null;
                    const pct =
                      delta != null && g.refPriceCents ? Math.round((Math.abs(delta) / g.refPriceCents) * 1000) / 10 : null;
                    return (
                      <li key={g.grainType} className="flex items-center justify-between gap-3 p-3 text-sm">
                        <span className="flex items-center gap-2.5 font-medium">
                          <GrainChip grain={g.grainType} size="sm" />
                          {grain.label}
                          <span className="font-normal text-muted-foreground">
                            {formatSacks(String(g.sacks))} sacas
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">
                            {g.avgPriceCents != null ? `${formatMoney(String(g.avgPriceCents))}/sc` : '—'}
                          </span>
                          {delta != null && pct != null ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                                delta <= 0
                                  ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              }`}
                            >
                              {delta <= 0 ? '▼' : '▲'} {pct}%
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="border-t p-3 text-xs text-muted-foreground">
                  Comparado ao preço de referência indicativo por saca — abaixo (▼) significa compra
                  melhor que a referência.
                </p>
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 font-semibold">Contratos por status</h2>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <StatusDonut data={summary.statusDistribution} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ProducerDashboard({
  summary,
  overview,
  name,
}: {
  summary: DashboardSummary;
  overview: FieldOverview;
  name?: string | null;
}): React.ReactElement {
  const p = summary.producer;
  const totalEstimatedSacks = overview.crops.reduce(
    (s, c) => s + c.pricing.estimatedTotalSacks,
    0,
  );
  const soldPct =
    totalEstimatedSacks > 0 ? Math.min(100, Math.round((p.soldSacks / totalEstimatedSacks) * 100)) : 0;
  const hasReceivable = Number(p.receivableCents) > 0;
  const firstName = name?.trim().split(/\s+/)[0] ?? name;

  return (
    <main className="container max-w-2xl animate-fade-up py-6 lg:max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">Olá, {firstName} 👋</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {overview.farm.name ?? 'Sua fazenda'} · {overview.farm.region}
        </p>
      </div>

      {/* Alertas do campo (clima + armazenagem + preço-alvo) — vindos das integrações */}
      {overview.weather.alerts.length > 0 ? (
        <div className="mt-4 space-y-2">
          {overview.weather.alerts.slice(0, 2).map((a, i) => (
            <Link
              key={i}
              href={a.action === 'criar_oferta' ? '/producao' : '/campo'}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm transition-shadow hover:shadow-md ${
                a.level === 'urgente'
                  ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                  : a.level === 'info'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
              }`}
            >
              {a.level === 'info' ? (
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <CircleAlert
                  className={`mt-0.5 h-4 w-4 shrink-0 ${a.level === 'urgente' ? 'text-red-600' : 'text-amber-600'}`}
                  aria-hidden
                />
              )}
              <span className="flex-1">
                {a.message}
                {a.action === 'criar_oferta' ? (
                  <span className="mt-0.5 block font-semibold">Criar oferta em Produção →</span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Ações que precisam do produtor — primeiro o que trava dinheiro */}
      {p.toSign > 0 ? (
        <Link
          href="/contracts?status=pendente_assinatura_produtor"
          className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/60 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-amber-800 dark:from-amber-950/50 dark:to-amber-950/20"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-200/80 dark:bg-amber-900" aria-hidden>
            <PenLine className="h-5 w-5 text-amber-800 dark:text-amber-300" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {p.toSign === 1 ? '1 contrato esperando sua assinatura' : `${p.toSign} contratos esperando sua assinatura`}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              A venda só vale depois de assinada. Toque para revisar e assinar.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        </Link>
      ) : null}

      {/* Duas zonas no desktop: dinheiro à esquerda, ações rápidas à direita */}
      <div className="mt-5 grid gap-6 lg:grid-cols-3">
      {/* Financeiro da safra — o produtor não perde o controle do dinheiro */}
      <section className="lg:col-span-2">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Wallet className="h-4 w-4" aria-hidden />
          Financeiro da safra
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Receita potencial"
            value={formatMoneyCompact(overview.totals.estimatedGrossValueCents)}
            fullValue={formatMoney(String(overview.totals.estimatedGrossValueCents))}
            icon={TrendingUp}
          />
          <KpiCard
            label="Vendido"
            value={formatMoneyCompact(p.contractedValueCents)}
            fullValue={formatMoney(p.contractedValueCents)}
            icon={FileText}
          />
          <KpiCard
            label="Já recebido"
            value={formatMoneyCompact(p.receivedCents)}
            fullValue={formatMoney(p.receivedCents)}
            tone="positive"
            icon={CheckCircle2}
          />
          <KpiCard
            label="A receber"
            value={formatMoneyCompact(p.receivableCents)}
            fullValue={formatMoney(p.receivableCents)}
            icon={HandCoins}
          />
        </div>
        {hasReceivable ? (
          <p className="mt-2 text-xs text-muted-foreground">
            O valor a receber é liberado conforme as entregas são confirmadas pelo comprador.
          </p>
        ) : null}
        {totalEstimatedSacks > 0 ? (
          <div className="mt-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Safra vendida</span>
              <span className="text-muted-foreground tabular-nums">
                {formatSacks(String(p.soldSacks))} de {formatSacks(String(totalEstimatedSacks))} sacas ({soldPct}%)
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700"
                style={{ width: `${Math.max(soldPct, 1)}%` }}
              />
            </div>
            {soldPct < 100 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Ainda há {formatSacks(String(Math.max(0, totalEstimatedSacks - p.soldSacks)))} sacas estimadas
                sem contrato —{' '}
                <Link href="/producao" className="font-medium text-primary hover:underline">
                  ver o que dá para vender
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Coluna lateral: ações rápidas + situação dos contratos */}
      <aside className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground lg:mb-[-4px]">Ações rápidas</h2>
        <ShortcutCard
          href="/producao"
          icon={Sprout}
          title="Vender produção"
          subtitle="Lotes prontos e sugestões do agente."
        />
        <ShortcutCard
          href="/campo"
          icon={Satellite}
          title="Meu campo"
          subtitle="Produtividade, clima e potencial."
        />
        <ShortcutCard
          href="/assistant"
          icon={Sparkles}
          title="Assistente"
          subtitle="Dúvidas de contratos e pagamentos."
        />
        <div className="grid grid-cols-2 gap-3">
          <Link href="/contracts?status=em_execucao" className="group">
            <KpiCard
              label="Entregas pendentes"
              value={String(p.pendingDeliveries)}
              icon={Truck}
              className="group-hover:border-primary/40"
            />
          </Link>
          <Link href="/contracts" className="group">
            <KpiCard
              label="Contratos no total"
              value={String(p.totalContracts)}
              icon={FileText}
              className="group-hover:border-primary/40"
            />
          </Link>
        </div>

        {/* Canal futuro: decisão de produto já tomada, integração adiada — manter visível. */}
        <div className="rounded-xl border border-dashed bg-card/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            Alertas no WhatsApp
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Em breve
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assinatura pendente, silo aquecendo e preço-alvo atingido vão chegar direto no seu
            WhatsApp. Enquanto isso, os avisos vão por e-mail.
          </p>
        </div>
      </aside>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Meus contratos</h2>
      <RecentList summary={summary} audience="producer" columns={2} />
    </main>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-accent/60 to-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground" aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-medium text-primary">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

function RecentList({
  summary,
  audience,
  columns = 1,
}: {
  summary: DashboardSummary;
  audience: 'buyer' | 'producer';
  /** Em telas largas, distribui os cards em 2 colunas. */
  columns?: 1 | 2;
}): React.ReactElement {
  if (summary.recentContracts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/50 p-6 text-sm text-muted-foreground">
        <FileText className="h-5 w-5" aria-hidden />
        Nenhum contrato ainda.
      </div>
    );
  }
  return (
    <div className={columns === 2 ? 'grid gap-3 lg:grid-cols-2' : 'space-y-3'}>
      {summary.recentContracts.map((c) => {
        const grain = GRAIN_LABELS[c.grainType];
        const days = daysUntil(c.deliveryDeadline);
        return (
          <Link
            key={c.id}
            href={`/contracts/${c.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <GrainChip grain={c.grainType} />
              <div>
                <p className="font-medium">
                  {c.contractNumber} · {grain.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatSacks(c.quantitySacks)} sacas · {c.counterpartyName ?? '—'}
                </p>
                <p className={`flex items-center gap-1 text-xs ${days <= 30 && days >= 0 ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}>
                  <CalendarClock className="h-3 w-3" aria-hidden />
                  Entrega: {formatDate(c.deliveryDeadline)}
                  {days >= 0 && days <= 30 ? ` (${days}d)` : ''}
                </p>
              </div>
            </div>
            <StatusBadge status={c.status} audience={audience} />
          </Link>
        );
      })}
    </div>
  );
}
