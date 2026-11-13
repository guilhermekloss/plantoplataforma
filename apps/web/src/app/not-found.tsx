import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { PlantorBrand } from '@/components/plantor-logo';
import { Button } from '@/components/ui/button';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-6 text-center">
      <PlantorBrand />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border bg-card p-8 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10" aria-hidden>
          <FileQuestion className="h-6 w-6 text-primary" />
        </span>
        <h1 className="text-lg font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Este endereço não existe ou você não tem acesso a ele — pode ser um contrato de outra
          organização ou um link antigo.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Ir para o painel</Link>
        </Button>
      </div>
    </div>
  );
}
