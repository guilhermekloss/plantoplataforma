import { FileSignature, FilePlus2, Package, ClipboardCheck, Wallet } from "lucide-react";
import type { ContractEventItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/relative-time";
import type { ContractEventType } from "@plantor/shared";
import { cn } from "@/lib/cn";

const EVENT_META: Record<ContractEventType, { label: string; icon: typeof FilePlus2; color: string }> = {
  CRIADO: { label: "Contrato criado", icon: FilePlus2, color: "text-neutral-500 bg-neutral-100" },
  STATUS_ALTERADO: { label: "Status alterado", icon: ClipboardCheck, color: "text-blue-600 bg-blue-50" },
  ENTREGA_REGISTRADA: { label: "Entrega registrada", icon: Package, color: "text-amber-600 bg-amber-50" },
  LAUDO_ADICIONADO: { label: "Laudo de qualidade adicionado", icon: ClipboardCheck, color: "text-amber-600 bg-amber-50" },
  PAGAMENTO_LIBERADO: { label: "Pagamento liberado", icon: Wallet, color: "text-green-600 bg-green-50" },
  ASSINADO: { label: "Contrato assinado por ambas as partes", icon: FileSignature, color: "text-terracota-600 bg-terracota-50" },
};

export interface ContractTimelineProps {
  events: ContractEventItem[];
  /** Reservado para a Fase 02 (blockchain) — não usado ainda. */
  blockchainTxHash?: string;
}

export function ContractTimeline({ events }: ContractTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">Sem eventos ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => {
        const meta = EVENT_META[event.type];
        const Icon = meta.icon;
        return (
          <li key={event.id} className="flex gap-3">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.color)}>
              <Icon size={16} />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900">{meta.label}</span>
              <span className="text-xs text-neutral-500">
                {event.actorUser ? `${event.actorUser.name} · ` : ""}
                {formatRelativeTime(event.createdAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
