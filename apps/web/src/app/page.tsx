import { GRAIN_TYPES } from '@plantor/shared';
import { Button } from '@/components/ui/button';
import { PlantorLogo } from '@/components/plantor-logo';

export default function HomePage(): React.ReactElement {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-16 text-center">
      <PlantorLogo className="h-16 w-16 text-primary" />
      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
        Contratos de grãos, do campo à liquidação
      </span>
      <h1 className="text-5xl font-bold tracking-tight">Plantor</h1>
      <p className="max-w-md text-muted-foreground">
        Plataforma de contratos de grãos para cooperativas, tradings e produtores rurais —
        com rastreabilidade e clareza para quem está no campo.
      </p>
      <p className="text-sm text-muted-foreground">{GRAIN_TYPES.length} tipos de grão suportados</p>
      <Button asChild size="lg">
        <a href="/login">Entrar</a>
      </Button>
    </main>
  );
}
