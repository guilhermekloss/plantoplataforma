import type { ContractStatus } from '@plantor/shared';
import { cn } from '@/lib/utils';
import { STATUS_BADGE, STATUS_LABELS, STATUS_LABELS_PRODUCER } from '@/lib/contracts';

const STATUS_DOT: Record<ContractStatus, string> = {
  rascunho: 'bg-zinc-400',
  pendente_assinatura_comprador: 'bg-amber-500',
  pendente_assinatura_produtor: 'bg-amber-500',
  assinado: 'bg-blue-500',
  em_execucao: 'bg-green-500',
  entregue_parcial: 'bg-yellow-500',
  disputado: 'bg-red-500',
  liquidado: 'bg-emerald-500',
  cancelado: 'bg-zinc-400',
};

export function StatusBadge({
  status,
  audience = 'buyer',
}: {
  status: ContractStatus;
  audience?: 'buyer' | 'producer';
}): React.ReactElement {
  const label = audience === 'producer' ? STATUS_LABELS_PRODUCER[status] : STATUS_LABELS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_BADGE[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} aria-hidden />
      {label}
    </span>
  );
}
