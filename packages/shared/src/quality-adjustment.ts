import type { QualityAdjType } from './enums.js';

/**
 * Cálculo de desconto por não conformidade de qualidade (Módulo 4).
 * Retorna o percentual de desconto (0–100) a aplicar sobre o valor da entrega.
 *
 * No MVP o gatilho é a umidade acima do máximo contratado. A taxa proporcional
 * (0,7% por 1% de excesso) e o % fixo (2%) são valores-piloto, configuráveis
 * em fase futura.
 */
export function calculatePriceAdjustment(
  contract: { maxMoisturePct: number; qualityAdjType: QualityAdjType },
  report: { moisturePct: number },
): number {
  const excess = Math.max(0, report.moisturePct - contract.maxMoisturePct);

  switch (contract.qualityAdjType) {
    case 'proportional':
      return excess * 0.7;
    case 'fixed_pct':
      return excess > 0 ? 2.0 : 0;
    case 'rejection':
      return excess > 0 ? 100 : 0;
    case 'none':
    default:
      return 0;
  }
}
