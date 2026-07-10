import type { GradeClass } from "./enums";

export interface QualityMetrics {
  moisturePct: number;
  impuritiesPct: number;
  brokenGrainsPct: number;
}

/**
 * Limites simplificados de classificação (baseados nos padrões MAPA
 * para soja/milho, sem cobrir todas as exceções da tabela oficial).
 * TIPO_1 é o baseline "sem desconto"; acima disso o desconto cresce.
 */
const BASELINE: QualityMetrics = {
  moisturePct: 14,
  impuritiesPct: 1,
  brokenGrainsPct: 8,
};

const THRESHOLDS: Record<Exclude<GradeClass, "FORA_DE_TIPO">, QualityMetrics> = {
  TIPO_1: BASELINE,
  TIPO_2: { moisturePct: 14.5, impuritiesPct: 2, brokenGrainsPct: 15 },
  TIPO_3: { moisturePct: 15, impuritiesPct: 3, brokenGrainsPct: 25 },
};

export function classifyGrade(metrics: QualityMetrics): GradeClass {
  if (isWithin(metrics, THRESHOLDS.TIPO_1)) return "TIPO_1";
  if (isWithin(metrics, THRESHOLDS.TIPO_2)) return "TIPO_2";
  if (isWithin(metrics, THRESHOLDS.TIPO_3)) return "TIPO_3";
  return "FORA_DE_TIPO";
}

function isWithin(metrics: QualityMetrics, limit: QualityMetrics): boolean {
  return (
    metrics.moisturePct <= limit.moisturePct &&
    metrics.impuritiesPct <= limit.impuritiesPct &&
    metrics.brokenGrainsPct <= limit.brokenGrainsPct
  );
}

/** Desconto percentual sobre o valor do lote a partir do excesso sobre o baseline TIPO_1. */
export function calculateDiscountPct(metrics: QualityMetrics): number {
  const excessMoisture = Math.max(0, metrics.moisturePct - BASELINE.moisturePct);
  const excessImpurities = Math.max(0, metrics.impuritiesPct - BASELINE.impuritiesPct);
  const excessBroken = Math.max(0, metrics.brokenGrainsPct - BASELINE.brokenGrainsPct);

  const discount = excessMoisture * 1.5 + excessImpurities * 1.0 + excessBroken * 0.5;
  return Math.min(30, Math.round(discount * 100) / 100);
}

export interface PriceAdjustment {
  gradeClass: GradeClass;
  discountPct: number;
  discountValueCents: number;
  finalValueCents: number;
}

export function calculatePriceAdjustment(metrics: QualityMetrics, grossValueCents: number): PriceAdjustment {
  const gradeClass = classifyGrade(metrics);
  const discountPct = calculateDiscountPct(metrics);
  const discountValueCents = Math.round((grossValueCents * discountPct) / 100);
  return {
    gradeClass,
    discountPct,
    discountValueCents,
    finalValueCents: grossValueCents - discountValueCents,
  };
}
