'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Tractor } from 'lucide-react';
import { GRAIN_TYPES, type GrainType } from '@plantor/shared';
import { Button } from '@/components/ui/button';
import { GRAIN_LABELS } from '@/lib/contracts';
import { simulateHarvest } from '@/app/campo/actions';

/**
 * Botão de demo (só fora de produção): simula o webhook de colheita da OEM.
 * Na Fase 03 esse evento chega sozinho da colheitadeira (John Deere/FieldView).
 */
export function SimulateHarvestButton(): React.ReactElement {
  const router = useRouter();
  const [grain, setGrain] = useState<GrainType>('soja');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function run(): void {
    setResult(null);
    startTransition(async () => {
      const res = await simulateHarvest(grain);
      setResult({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? '' });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-dashed bg-card/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">Demo · evento da colheitadeira</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor="simulate-grain" className="sr-only">
          Cultura da colheita simulada
        </label>
        <select
          id="simulate-grain"
          value={grain}
          onChange={(e) => setGrain(e.target.value as GrainType)}
          disabled={pending}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {GRAIN_TYPES.map((g) => (
            <option key={g} value={g}>
              {GRAIN_LABELS[g]?.label ?? g}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={run} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Tractor className="h-4 w-4" aria-hidden />
          )}
          Simular colheita
        </Button>
      </div>
      {result ? (
        <p
          className={`mt-2 text-xs ${result.ok ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}
          aria-live="polite"
        >
          {result.text}{' '}
          {result.ok ? (
            <Link href="/producao" className="font-medium underline underline-offset-2">
              Ir para Produção
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
