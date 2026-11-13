'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BellRing, Loader2, Target } from 'lucide-react';
import { GRAIN_TYPES, type GrainType } from '@plantor/shared';
import { GrainChip } from '@/components/grain-icon';
import { SectionTitle } from '@/components/campo/metric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GRAIN_LABELS, formatMoney } from '@/lib/contracts';
import type { MarketQuote } from '@/lib/field-data';
import { setTargetPrice } from '@/app/campo/actions';

function toReais(cents: number | null): string {
  return cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

function parseReais(v: string): number | null {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/**
 * Preço-alvo por cultura: o produtor define "vendo quando chegar a R$ X/saca" e a
 * plataforma avisa (alerta + sinal de venda) quando a cotação cruza o alvo.
 */
export function TargetPricePanel({
  quotes,
  source,
}: {
  quotes: MarketQuote[];
  source: string;
}): React.ReactElement | null {
  if (quotes.length === 0) return null;
  // A API não garante ordem das cotações; fixa a ordem para os cards não "pularem".
  const sorted = [...quotes].sort(
    (a, b) => GRAIN_TYPES.indexOf(a.grainType) - GRAIN_TYPES.indexOf(b.grainType),
  );
  return (
    <section className="mt-6">
      <SectionTitle icon={Target}>Preço-alvo de venda</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((q) => (
          <TargetPriceCard key={q.grainType} quote={q} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Avisamos quando a cotação cruzar o seu alvo. Cotação: {source}.
      </p>
    </section>
  );
}

function TargetPriceCard({ quote }: { quote: MarketQuote }): React.ReactElement {
  const router = useRouter();
  const [value, setValue] = useState(toReais(quote.targetPriceCents));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const grain = quote.grainType as GrainType;
  const label = GRAIN_LABELS[grain]?.label ?? quote.grainType;
  const inputId = `target-${quote.grainType}`;
  const parsed = parseReais(value);
  const unchanged = parsed === quote.targetPriceCents;

  function save(cents: number | null): void {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setTargetPrice(grain, cents);
      if (!res.ok) {
        setError(res.error ?? 'Erro ao salvar.');
        return;
      }
      if (cents == null) setValue('');
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${
        quote.targetHit ? 'border-green-300 ring-1 ring-green-200 dark:border-green-800 dark:ring-green-900' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">
          <GrainChip grain={grain} size="sm" />
          {label}
        </span>
        {quote.targetHit ? (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950/50 dark:text-green-300">
            <BellRing className="h-3 w-3" aria-hidden />
            Alvo atingido
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Cotação hoje</p>
      <p className="text-lg font-semibold tabular-nums">{formatMoney(String(quote.priceCents))}/sc</p>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (parsed == null) {
            setError('Informe um valor por saca maior que zero.');
            return;
          }
          save(parsed);
        }}
      >
        <label htmlFor={inputId} className="text-xs text-muted-foreground">
          Meu alvo (R$/saca)
        </label>
        <div className="mt-1 flex gap-2">
          <Input
            id={inputId}
            inputMode="decimal"
            placeholder="ex.: 130,00"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          <Button type="submit" size="sm" disabled={pending || unchanged || value.trim() === ''}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Salvar'}
          </Button>
        </div>
      </form>

      <div className="mt-2 flex min-h-5 items-center justify-between gap-2 text-xs" aria-live="polite">
        {error ? (
          <span id={`${inputId}-error`} className="text-destructive">
            {error}
          </span>
        ) : saved ? (
          <span className="text-green-700 dark:text-green-400">Alvo salvo.</span>
        ) : quote.targetHit ? (
          <Link href="/producao" className="font-medium text-primary underline underline-offset-2">
            Criar oferta agora
          </Link>
        ) : quote.targetPriceCents != null ? (
          <span className="text-muted-foreground">
            Faltam {formatMoney(String(Math.max(0, quote.targetPriceCents - quote.priceCents)))}/sc
          </span>
        ) : (
          <span className="text-muted-foreground">Sem alvo definido.</span>
        )}
        {quote.targetPriceCents != null ? (
          <button
            type="button"
            className="shrink-0 text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
            onClick={() => save(null)}
            disabled={pending}
          >
            Remover alvo
          </button>
        ) : null}
      </div>
    </div>
  );
}
