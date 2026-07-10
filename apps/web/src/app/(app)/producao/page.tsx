import { auth } from "@/lib/auth";
import { listLotesAction } from "@/server-actions/lotes";
import { LoteCard } from "@/components/producao/LoteCard";
import { NewLoteForm } from "@/components/producao/NewLoteForm";
import { SuggestOffers } from "@/components/producao/SuggestOffers";

export default async function ProducaoPage() {
  const session = await auth();

  if (session?.user.role !== "PRODUCER") {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-neutral-500">
        A tela de produção está disponível apenas para produtores.
      </p>
    );
  }

  const lotes = await listLotesAction();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Minha produção</h1>

      <SuggestOffers />

      <NewLoteForm />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-700">Meus lotes</h2>
        {lotes.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum lote cadastrado ainda.</p>
        ) : (
          lotes.map((lote) => <LoteCard key={lote.id} lote={lote} />)
        )}
      </div>
    </div>
  );
}
