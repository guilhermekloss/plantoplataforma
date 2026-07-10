import type { LoteStatus } from "@plantor/shared";
import { cn } from "@/lib/cn";

const STATUS_META: Record<LoteStatus, { label: string; className: string }> = {
  PLANTADO: { label: "Plantado", className: "bg-neutral-100 text-neutral-600" },
  COLHIDO: { label: "Colhido", className: "bg-amber-100 text-amber-700" },
  BENEFICIAMENTO: { label: "Em beneficiamento", className: "bg-blue-100 text-blue-700" },
  DISPONIVEL: { label: "Disponível", className: "bg-green-100 text-green-700" },
  OFERTADO: { label: "Ofertado", className: "bg-terracota-100 text-terracota-700" },
  VENDIDO: { label: "Vendido", className: "bg-neutral-800 text-white" },
};

export function LoteStatusBadge({ status }: { status: LoteStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}
