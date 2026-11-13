import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, FileText, Plus, Search } from 'lucide-react';
import { CONTRACT_STATUSES, type ContractStatus } from '@plantor/shared';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/server-api';
import { AppHeader } from '@/components/app-header';
import { GrainChip } from '@/components/grain-icon';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  GRAIN_LABELS,
  formatDate,
  formatSacks,
  type Contract,
} from '@/lib/contracts';

const FILTERS: { value: ContractStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'rascunho', label: 'Rascunhos' },
  { value: 'pendente_assinatura_produtor', label: 'Aguardando produtor' },
  { value: 'em_execucao', label: 'Em andamento' },
  { value: 'liquidado', label: 'Concluídos' },
];

/** Normaliza para busca sem acento e sem caixa ("cooperativa São João" ~ "sao joao"). */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');

  const isProducer = session.user.organizationType === 'producer';
  const audience = isProducer ? 'producer' : 'buyer';
  const status = searchParams.status as ContractStatus | undefined;
  const validStatus = status && CONTRACT_STATUSES.includes(status) ? status : undefined;
  const query = searchParams.q?.trim() ?? '';

  // Uma busca só: os contadores dos filtros saem da lista completa.
  const allContracts = await apiFetch<Contract[]>('/contracts');
  const countFor = (s: ContractStatus | 'all'): number =>
    s === 'all' ? allContracts.length : allContracts.filter((c) => c.status === s).length;

  const q = fold(query);
  const contracts = allContracts.filter((c) => {
    if (validStatus && c.status !== validStatus) return false;
    if (!q) return true;
    const counterparty = isProducer ? c.buyer?.name : c.seller?.name;
    return [c.contractNumber, counterparty ?? '', GRAIN_LABELS[c.grainType].label].some((v) =>
      fold(v).includes(q),
    );
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      <main className="container animate-fade-up py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
            <p className="text-sm text-muted-foreground">
              {contracts.length === 0
                ? 'Nenhum contrato neste filtro.'
                : `${contracts.length} ${contracts.length === 1 ? 'contrato' : 'contratos'} neste filtro.`}
            </p>
          </div>
          {!isProducer ? (
            <Button asChild>
              <Link href="/contracts/new">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Novo contrato
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active =
              (f.value === 'all' && !validStatus) || f.value === validStatus;
            const params = new URLSearchParams();
            if (f.value !== 'all') params.set('status', f.value);
            if (query) params.set('q', query);
            const qs = params.toString();
            const count = countFor(f.value);
            return (
              <Link
                key={f.value}
                href={qs ? `/contracts?${qs}` : '/contracts'}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primary font-medium text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-xs tabular-nums ${active ? 'text-primary-foreground/75' : 'text-muted-foreground/70'}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        <form method="GET" action="/contracts" className="relative mt-3 max-w-sm">
          {validStatus ? <input type="hidden" name="status" value={validStatus} /> : null}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por número, contraparte ou grão…"
            aria-label="Buscar contratos"
            className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
        </form>

        {contracts.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-muted-foreground">Nenhum contrato encontrado.</p>
            <Link href="/contracts" className="text-sm font-medium text-primary hover:underline">
              Limpar filtro
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {contracts.map((c) => {
              const grain = GRAIN_LABELS[c.grainType];
              const counterparty = isProducer ? c.buyer?.name : c.seller?.name;
              return (
                <Link
                  key={c.id}
                  href={`/contracts/${c.id}`}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <GrainChip grain={c.grainType} />
                    <div>
                      <p className="font-medium">
                        {c.contractNumber} · {grain.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatSacks(c.quantitySacks)} sacas · {c.harvestYear} ·{' '}
                        {counterparty ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      {formatDate(c.deliveryDeadline)}
                    </span>
                    <StatusBadge status={c.status} audience={audience} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
