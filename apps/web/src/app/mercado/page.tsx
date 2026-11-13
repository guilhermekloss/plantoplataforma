import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { apiFetch } from '@/lib/server-api';
import { AppHeader } from '@/components/app-header';
import { MarketplaceBoard } from '@/components/marketplace-board';
import type { MarketplaceOffer } from '@/lib/offers';

export default async function MercadoPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.organizationType === 'producer') redirect('/producao');

  const offers = await apiFetch<MarketplaceOffer[]>('/offers/marketplace');

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader name={session.user.name} orgType={session.user.organizationType} />
      <main className="container animate-fade-up py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Ofertas disponíveis</h1>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Lotes disponibilizados por produtores. Gere o contrato com um clique — os dados de campo
          (produtividade, qualidade, clima) já vêm anexados.
        </p>
        <MarketplaceBoard offers={offers} />
      </main>
    </div>
  );
}
