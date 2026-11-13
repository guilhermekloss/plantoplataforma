import {
  Ban,
  CircleAlert,
  FilePlus2,
  FlaskConical,
  HandCoins,
  Link2,
  Package,
  PenLine,
  Play,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { EventType } from '@plantor/shared';
import type { ContractEvent } from '@/lib/contracts';

const EVENT_CONFIG: Record<EventType, { icon: LucideIcon; dot: string }> = {
  criado: { icon: FilePlus2, dot: 'bg-zinc-400' },
  assinado_comprador: { icon: PenLine, dot: 'bg-blue-500' },
  assinado_produtor: { icon: PenLine, dot: 'bg-blue-500' },
  em_execucao: { icon: Play, dot: 'bg-green-500' },
  entregue: { icon: Package, dot: 'bg-green-500' },
  entregue_parcial: { icon: Package, dot: 'bg-yellow-500' },
  laudo_anexado: { icon: FlaskConical, dot: 'bg-purple-500' },
  pagamento_liberado: { icon: HandCoins, dot: 'bg-green-700' },
  pagamento_pago: { icon: Wallet, dot: 'bg-green-700' },
  disputado: { icon: CircleAlert, dot: 'bg-red-500' },
  cancelado: { icon: Ban, dot: 'bg-red-800' },
  hash_registrado_onchain: { icon: Link2, dot: 'bg-indigo-500' },
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  if (days <= 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString('pt-BR');
}

export function ContractTimeline({ events }: { events: ContractEvent[] }): React.ReactElement {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>;
  }
  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const cfg = EVENT_CONFIG[event.eventType];
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.dot} text-white`}
                aria-hidden
              >
                <cfg.icon className="h-3.5 w-3.5" />
              </span>
              <span className="mt-1 w-px flex-1 bg-border" />
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium">{event.description}</p>
              <p className="text-xs text-muted-foreground">
                {event.performedBy?.name ? `${event.performedBy.name} · ` : ''}
                {formatWhen(event.createdAt)}
              </p>
              {/* Fase 02: link para o explorador on-chain quando houver hash */}
              {event.blockchainTxHash ? (
                <a
                  href={`https://polygonscan.com/tx/${event.blockchainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver na blockchain ↗
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
