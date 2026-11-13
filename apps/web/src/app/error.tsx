'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert, RotateCcw } from 'lucide-react';
import { PlantorBrand } from '@/components/plantor-logo';
import { Button } from '@/components/ui/button';

/** Tela de erro global: nunca mostrar o stack cru do Next para o usuário. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    // Mantém o diagnóstico no console para o time, sem expor na tela.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-6 text-center">
      <PlantorBrand />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border bg-card p-8 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50" aria-hidden>
          <CircleAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
        </span>
        <h1 className="text-lg font-semibold">Algo deu errado por aqui</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar esta página. Seus contratos e dados estão seguros — tente de
          novo em instantes.
        </p>
        <div className="mt-2 flex gap-2">
          <Button onClick={reset}>
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
            Tentar de novo
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Ir para o painel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
