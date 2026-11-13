import { PlantorBrand } from '@/components/plantor-logo';

/**
 * Skeleton global: feedback imediato na navegação entre páginas (server
 * components buscam dados no servidor — em rede lenta, sem isso a tela congela).
 */
export default function Loading(): React.ReactElement {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/85">
        <div className="container flex h-14 items-center justify-between">
          <PlantorBrand />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      </header>
      <main className="container py-8" aria-busy aria-label="Carregando">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted/70" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      </main>
    </div>
  );
}
