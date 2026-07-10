import Link from "next/link";
import { CONTRACT_STATUSES } from "@plantor/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/contracts/StatusBadge";
import { listContractsAction } from "@/server-actions/contracts";
import { kgToSacas } from "@plantor/shared";

export default async function ContractsPage({ searchParams }: { searchParams: { status?: string } }) {
  const contracts = await listContractsAction(searchParams.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Contratos</h1>
        <Link href="/contracts/new">
          <Button>Novo contrato</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/contracts">
          <Button variant={!searchParams.status ? "default" : "outline"} size="sm">
            Todos
          </Button>
        </Link>
        {CONTRACT_STATUSES.map((status) => (
          <Link key={status} href={`/contracts?status=${status}`}>
            <Button variant={searchParams.status === status ? "default" : "outline"} size="sm">
              {status.replaceAll("_", " ")}
            </Button>
          </Link>
        ))}
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum contrato encontrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {contracts.map((contract) => (
            <Link key={contract.id} href={`/contracts/${contract.id}`}>
              <Card className="flex items-center justify-between p-4 hover:border-terracota-300">
                <div>
                  <p className="font-medium text-neutral-900">{contract.number}</p>
                  <p className="text-sm text-neutral-500">
                    {contract.buyerOrg.name} → {contract.sellerOrg.name} · {contract.crop} ·{" "}
                    {kgToSacas(contract.quantityKg).toLocaleString("pt-BR")} sc
                  </p>
                </div>
                <StatusBadge status={contract.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
