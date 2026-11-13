import type { FieldReading } from '@prisma/client';
import type { GrainType } from '@plantor/shared';
import { SAFE_GRAIN_TEMP_MAX_C, STORAGE_MOISTURE_MAX_PCT } from '@plantor/shared';

/**
 * Score de qualidade do lote SIMULADO: nota 0–100 derivada dos dados de campo
 * que a plataforma já consolida (umidade, NDVI, geadas, perda de colheita,
 * termometria do silo). Determinístico — mesmo lote, mesma nota. Na Fase 03 o
 * cálculo passa a usar laudo laboratorial e classificação MAPA reais.
 */

export interface QualityFactor {
  label: string;
  /** Impacto em pontos sobre a nota (negativo = penalidade). */
  deltaPts: number;
  detail: string;
}

export type QualityGrade = 'A' | 'B' | 'C';

export interface GrainQualityScore {
  score: number; // 0–100
  grade: QualityGrade;
  /** Cobertura de dados: com poucos sensores a nota vale menos, não menos pontos. */
  confidence: 'alta' | 'media' | 'baixa';
  factors: QualityFactor[];
  source: string;
}

export interface QualityInputs {
  grainType: GrainType;
  storedMoisturePct: number | null;
  harvestMoisturePct: number | null;
  ndviAvg: number | null;
  frostEvents: number | null;
  harvestLossSacksPerHa: number | null;
  /** Temperatura atual da massa no silo (null se sem termometria). */
  grainTempC: number | null;
}

function gradeOf(score: number): QualityGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  return 'C';
}

/** Monta os insumos do score a partir de uma leitura de campo persistida. */
export function qualityFromReading(r: FieldReading): GrainQualityScore {
  const storage = r.storage as { grainTempC?: number | null } | null;
  return grainQualityScore({
    grainType: r.grainType,
    storedMoisturePct: r.storedMoisturePct != null ? Number(r.storedMoisturePct) : null,
    harvestMoisturePct: r.harvestMoisturePct != null ? Number(r.harvestMoisturePct) : null,
    ndviAvg: r.ndviAvg != null ? Number(r.ndviAvg) : null,
    frostEvents: r.frostEvents,
    harvestLossSacksPerHa: r.harvestLossSacksPerHa != null ? Number(r.harvestLossSacksPerHa) : null,
    grainTempC: typeof storage?.grainTempC === 'number' ? storage.grainTempC : null,
  });
}

export function grainQualityScore(q: QualityInputs): GrainQualityScore {
  const factors: QualityFactor[] = [];
  let score = 100;
  let signals = 0;

  const moisture = q.storedMoisturePct ?? q.harvestMoisturePct;
  const moistureMax = STORAGE_MOISTURE_MAX_PCT[q.grainType];
  if (moisture != null && moistureMax != null) {
    signals += 1;
    const excess = moisture - moistureMax;
    if (excess > 0) {
      const delta = -Math.min(24, Math.round(excess * 8));
      score += delta;
      factors.push({
        label: 'Umidade acima da conservação',
        deltaPts: delta,
        detail: `${moisture.toLocaleString('pt-BR')}% medido vs. máximo de ${moistureMax}% para armazenagem.`,
      });
    } else {
      factors.push({
        label: 'Umidade na faixa de conservação',
        deltaPts: 0,
        detail: `${moisture.toLocaleString('pt-BR')}% (limite ${moistureMax}%).`,
      });
    }
  }

  if (q.ndviAvg != null) {
    signals += 1;
    if (q.ndviAvg >= 0.75) {
      factors.push({
        label: 'Lavoura vigorosa no ciclo',
        deltaPts: 0,
        detail: `NDVI médio ${q.ndviAvg.toFixed(2)} — vigor vegetativo alto, grão bem formado.`,
      });
    } else if (q.ndviAvg >= 0.6) {
      score -= 5;
      factors.push({
        label: 'Vigor médio no ciclo',
        deltaPts: -5,
        detail: `NDVI médio ${q.ndviAvg.toFixed(2)} — desenvolvimento razoável, sem indicativo de estresse severo.`,
      });
    } else {
      score -= 12;
      factors.push({
        label: 'Sinal de estresse na lavoura',
        deltaPts: -12,
        detail: `NDVI médio ${q.ndviAvg.toFixed(2)} — abaixo de 0,60, possível impacto no peso e formação do grão.`,
      });
    }
  }

  if (q.frostEvents != null) {
    signals += 1;
    if (q.frostEvents > 0) {
      const delta = -Math.min(18, q.frostEvents * 6);
      score += delta;
      factors.push({
        label: `Geada no ciclo (${q.frostEvents}×)`,
        deltaPts: delta,
        detail:
          'Eventos de geada registrados pela estação meteorológica podem afetar a qualidade do grão.',
      });
    } else {
      factors.push({
        label: 'Ciclo sem geadas',
        deltaPts: 0,
        detail: 'Nenhum evento de geada registrado no ciclo.',
      });
    }
  }

  if (q.harvestLossSacksPerHa != null) {
    signals += 1;
    if (q.harvestLossSacksPerHa > 3.5) {
      score -= 10;
      factors.push({
        label: 'Perda alta na colheita',
        deltaPts: -10,
        detail: `${q.harvestLossSacksPerHa.toLocaleString('pt-BR')} sc/ha de perda — pode indicar grão fora do ponto.`,
      });
    } else if (q.harvestLossSacksPerHa > 2) {
      score -= 5;
      factors.push({
        label: 'Perda moderada na colheita',
        deltaPts: -5,
        detail: `${q.harvestLossSacksPerHa.toLocaleString('pt-BR')} sc/ha de perda registrada pela colheitadeira.`,
      });
    }
  }

  if (q.grainTempC != null) {
    signals += 1;
    if (q.grainTempC > SAFE_GRAIN_TEMP_MAX_C) {
      score -= 10;
      factors.push({
        label: 'Massa de grãos aquecida no silo',
        deltaPts: -10,
        detail: `${q.grainTempC.toLocaleString('pt-BR')}°C na termometria (limite ${SAFE_GRAIN_TEMP_MAX_C}°C) — risco de deterioração se persistir.`,
      });
    } else {
      factors.push({
        label: 'Armazenagem sob controle',
        deltaPts: 0,
        detail: `${q.grainTempC.toLocaleString('pt-BR')}°C na termometria do silo, dentro da faixa segura.`,
      });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    grade: gradeOf(score),
    confidence: signals >= 4 ? 'alta' : signals >= 2 ? 'media' : 'baixa',
    factors,
    source: 'Score simulado no MVP — na Fase 03 entra laudo laboratorial e classificação MAPA.',
  };
}
