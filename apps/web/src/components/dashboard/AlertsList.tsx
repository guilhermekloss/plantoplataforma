import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardContractSummary } from "@/lib/types";

export function AlertsList({ contracts }: { contracts: DashboardContractSummary[] }) {
  if (contracts.length === 0) {
    return <p className="text-sm text-neutral-500">Sem prazos de entrega próximos.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {contracts.map((c) => (
        <Link key={c.id} href={`/contracts/${c.id}`}>
          <Card className="flex items-center gap-3 p-3 hover:border-amber-300">
            <AlertTriangle size={18} className="shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {c.number} · {c.counterpartyName}
              </p>
              <p className="text-xs text-neutral-500">
                Entrega até {new Date(c.deliveryDeadline).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
