import type { LoteStatus } from "./enums";

/**
 * Ciclo do lote: PLANTADO→COLHIDO→(BENEFICIAMENTO opcional)→DISPONIVEL→
 * OFERTADO→VENDIDO. OFERTADO/VENDIDO são setados automaticamente pelo
 * OffersModule (criar oferta / gerar contrato), não pelo produtor
 * diretamente.
 */
export const LOTE_TRANSITIONS: Record<LoteStatus, LoteStatus[]> = {
  PLANTADO: ["COLHIDO"],
  COLHIDO: ["BENEFICIAMENTO", "DISPONIVEL"],
  BENEFICIAMENTO: ["DISPONIVEL"],
  DISPONIVEL: ["OFERTADO"],
  OFERTADO: ["DISPONIVEL", "VENDIDO"],
  VENDIDO: [],
};

export function canTransitionLote(from: LoteStatus, to: LoteStatus): boolean {
  return LOTE_TRANSITIONS[from].includes(to);
}

export function assertTransitionLote(from: LoteStatus, to: LoteStatus): void {
  if (!canTransitionLote(from, to)) {
    throw new Error(`Transição de status de lote inválida: ${from} -> ${to}`);
  }
}
