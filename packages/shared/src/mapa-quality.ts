import type { GrainGrade, GrainType } from './enums.js';

/**
 * Padrões de classificação MAPA usados como defaults do wizard e para o cálculo
 * automático de grade na entrega.
 *
 * Soja: IN MAPA 11/2007. Milho: IN MAPA 60/2011.
 *
 * Os limites são "máximos" para umidade/impurezas/avariados e "mínimo" para o
 * peso específico (PH). `null` em minSpecificWeightGL = parâmetro não avaliado
 * para aquele grão no MVP.
 */
export interface GrainGradeThreshold {
  maxMoisturePct: number;
  maxImpurityPct: number;
  maxDamagedPct: number;
  minSpecificWeightGL: number | null;
}

export type GrainGradeTable = Record<Exclude<GrainGrade, 'fora_padrao'>, GrainGradeThreshold>;

const SOJA_THRESHOLDS: GrainGradeTable = {
  // Soja (IN MAPA 11/2007)
  T1: { maxMoisturePct: 14, maxImpurityPct: 1, maxDamagedPct: 8, minSpecificWeightGL: 660 },
  T2: { maxMoisturePct: 14, maxImpurityPct: 2, maxDamagedPct: 15, minSpecificWeightGL: 660 },
  T3: { maxMoisturePct: 14, maxImpurityPct: 4, maxDamagedPct: 30, minSpecificWeightGL: 660 },
};

const MILHO_THRESHOLDS: GrainGradeTable = {
  // Milho (IN MAPA 60/2011) — PH não parametrizado no MVP
  T1: { maxMoisturePct: 14, maxImpurityPct: 1, maxDamagedPct: 6, minSpecificWeightGL: null },
  T2: { maxMoisturePct: 14, maxImpurityPct: 1.5, maxDamagedPct: 12, minSpecificWeightGL: null },
  T3: { maxMoisturePct: 14, maxImpurityPct: 2, maxDamagedPct: 18, minSpecificWeightGL: null },
};

/**
 * Tabelas de threshold por grão. Grãos sem norma MAPA detalhada no MVP usam a
 * tabela da soja como base genérica até a Fase 02 (apenas defaults editáveis).
 */
export const MAPA_GRADE_TABLES: Record<GrainType, GrainGradeTable> = {
  soja: SOJA_THRESHOLDS,
  milho: MILHO_THRESHOLDS,
  cafe: SOJA_THRESHOLDS,
  trigo: SOJA_THRESHOLDS,
  algodao: SOJA_THRESHOLDS,
  sorgo: SOJA_THRESHOLDS,
  feijao: SOJA_THRESHOLDS,
};

/** Defaults de pré-preenchimento do wizard (Tipo 1) para o grão informado. */
export function defaultQualityParams(grain: GrainType): GrainGradeThreshold {
  return MAPA_GRADE_TABLES[grain].T1;
}

export interface MeasuredQuality {
  moisturePct: number;
  impurityPct: number;
  damagedPct: number;
  specificWeightGL?: number | null;
}

/**
 * Determina a grade (T1/T2/T3/fora_padrao) a partir dos parâmetros medidos,
 * usando a tabela MAPA do grão. Retorna a melhor (menor) classe cujos limites
 * o lote satisfaz integralmente.
 */
export function classifyGrade(grain: GrainType, measured: MeasuredQuality): GrainGrade {
  const table = MAPA_GRADE_TABLES[grain];
  for (const grade of ['T1', 'T2', 'T3'] as const) {
    const t = table[grade];
    const moistureOk = measured.moisturePct <= t.maxMoisturePct;
    const impurityOk = measured.impurityPct <= t.maxImpurityPct;
    const damagedOk = measured.damagedPct <= t.maxDamagedPct;
    const phOk =
      t.minSpecificWeightGL == null ||
      measured.specificWeightGL == null ||
      measured.specificWeightGL >= t.minSpecificWeightGL;
    if (moistureOk && impurityOk && damagedOk && phOk) {
      return grade;
    }
  }
  return 'fora_padrao';
}
