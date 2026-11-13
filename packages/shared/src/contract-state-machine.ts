import type { ContractStatus } from './enums.js';

/**
 * Máquina de estados do contrato (ver PROMPT_MVP.md → "Máquina de estados do contrato").
 *
 * rascunho
 *   → pendente_assinatura_comprador
 *     → pendente_assinatura_produtor
 *       → assinado
 *         → em_execucao
 *           → entregue_parcial | disputado | liquidado | cancelado
 *
 * Cada transição deve gerar um ContractEvent na camada de serviço.
 */
export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  rascunho: ['pendente_assinatura_comprador', 'cancelado'],
  pendente_assinatura_comprador: ['pendente_assinatura_produtor', 'cancelado'],
  pendente_assinatura_produtor: ['assinado', 'cancelado'],
  assinado: ['em_execucao', 'cancelado'],
  em_execucao: ['entregue_parcial', 'liquidado', 'disputado', 'cancelado'],
  entregue_parcial: ['entregue_parcial', 'liquidado', 'disputado', 'cancelado'],
  disputado: ['em_execucao', 'liquidado', 'cancelado'],
  liquidado: [],
  cancelado: [],
};

export function canTransition(from: ContractStatus, to: ContractStatus): boolean {
  return CONTRACT_TRANSITIONS[from].includes(to);
}

/** Status considerados "ativos" para fins de KPI no dashboard da cooperativa. */
export const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = ['em_execucao', 'entregue_parcial'];

/** Status em que o contrato ainda gera valor financeiro em aberto (não liquidado/cancelado). */
export const OPEN_CONTRACT_STATUSES: ContractStatus[] = [
  'assinado',
  'em_execucao',
  'entregue_parcial',
  'disputado',
];
