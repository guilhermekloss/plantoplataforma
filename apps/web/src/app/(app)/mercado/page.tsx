import { auth } from "@/lib/auth";
import { listMarketAction } from "@/server-actions/offers";
import { OfferCard } from "@/components/mercado/OfferCard";

export default async function MercadoPage() {
  const session = await auth();

  if (session?.user.role === "PRODUCER") {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-neutral-500">
        O mercado é a tela da cooperativa/trading para ver ofertas de produtores.
      </p>
    );
  }

  const offers = await listMarketAction();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-neutral-900">Mercado</h1>
      <p className="text-sm text-neutral-500">Ofertas abertas de produtores — gere o contrato em 1 clique.</p>

      {offers.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma oferta aberta no momento.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
