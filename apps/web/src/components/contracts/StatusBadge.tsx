import type { ContractStatus } from "@plantor/shared";
import { cn } from "@/lib/cn";

const STATUS_META: Record<ContractStatus, { label: string; className: string }> = {
  RASCUNHO: { label: "Rascunho", className: "bg-neutral-100 text-neutral-600" },
  PENDENTE_ASSINATURA: { label: "Pendente de assinatura", className: "bg-amber-100 text-amber-700" },
  ASSINADO: { label: "Assinado", className: "bg-terracota-100 text-terracota-700" },
  ENTREGA_PARCIAL: { label: "Entrega parcial", className: "bg-blue-100 text-blue-700" },
  LIQUIDADO: { label: "Liquidado", className: "bg-green-100 text-green-700" },
  CANCELADO: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}
