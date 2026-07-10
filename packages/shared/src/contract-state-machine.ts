import type { ContractStatus } from "./enums";

/** Transições válidas de status do contrato. */
export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  RASCUNHO: ["PENDENTE_ASSINATURA", "CANCELADO"],
  PENDENTE_ASSINATURA: ["ASSINADO", "CANCELADO"],
  ASSINADO: ["ENTREGA_PARCIAL", "LIQUIDADO", "CANCELADO"],
  ENTREGA_PARCIAL: ["LIQUIDADO", "CANCELADO"],
  LIQUIDADO: [],
  CANCELADO: [],
};

export function canTransition(from: ContractStatus, to: ContractStatus): boolean {
  return CONTRACT_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ContractStatus, to: ContractStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transição de status inválida: ${from} -> ${to}`);
  }
}
