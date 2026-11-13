import type { GrainType } from '@plantor/shared';
import { rng, seedFromText } from './simulation';

/**
 * Provider SIMULADO de sensoriamento remoto (NDVI).
 * Fase 03: Copernicus Sentinel-2 (gratuito, revisita ~5 dias) ou EOSDA Crop
 * Monitoring API — a integração real devolve a mesma SatelliteView; quem
 * consome não sabe a origem.
 */

export interface NdviPoint {
  date: string; // ISO (yyyy-mm-dd)
  ndvi: number; // 0–1
}

export interface SatelliteView {
  source: string;
  ndviSeries: NdviPoint[];
  peakNdvi: number;
  /** Estimativa de produtividade pré-colheita (sc/ha) — null para culturas sem modelo. */
  estimatedYieldSacksPerHa: number | null;
  /** Faixa de confiança da estimativa (sc/ha). */
  yieldRangeSacksPerHa: { min: number; max: number } | null;
  note: string;
}

/**
 * Fator sc/ha por unidade de NDVI de pico, calibrado nos benchmarks regionais
 * do seed (DERAL/Conab — Oeste e Centro-Sul do PR). Modelo linear simples:
 * produtividade ≈ NDVI de pico × fator.
 */
const YIELD_PER_PEAK_NDVI: Partial<Record<GrainType, number>> = {
  soja: 84,
  milho: 168,
  trigo: 78,
  sorgo: 110,
  feijao: 46,
};

interface LotForSatellite {
  id: string;
  grainType: GrainType;
  plantingDate: Date | null;
  /** NDVI médio conhecido do ciclo (leitura mais recente do lote). */
  ndviAvg: number | null;
  status: string;
}

const PASS_INTERVAL_DAYS = 15; // uma leitura consolidada por quinzena
const CYCLE_DAYS = 130; // ciclo típico até NDVI de pico + senescência

/**
 * Série NDVI quinzenal do plantio até hoje: curva logística (emergência →
 * pico → senescência) com ruído determinístico por lote. Ancorada no ndviAvg
 * do lote quando disponível, para a série e o card do lote contarem a mesma
 * história.
 */
export function satelliteView(lot: LotForSatellite, now = new Date()): SatelliteView | null {
  if (!lot.plantingDate) return null;
  const rand = rng(seedFromText(lot.id, lot.plantingDate));
  const daysSincePlanting = Math.floor((now.getTime() - lot.plantingDate.getTime()) / (24 * 3600 * 1000));
  if (daysSincePlanting < PASS_INTERVAL_DAYS) return null;

  // Pico-alvo: para lote em desenvolvimento o ndviAvg é a leitura atual (curva
  // ainda subindo); para lote colhido, é a média do ciclo (pico acima dela).
  const growing = lot.status === 'em_desenvolvimento';
  const anchor = lot.ndviAvg ?? 0.72;
  const targetPeak = Math.min(0.92, growing ? anchor + 0.25 : anchor + 0.1);

  const points: NdviPoint[] = [];
  const passes = Math.min(Math.floor(daysSincePlanting / PASS_INTERVAL_DAYS), 10);
  for (let i = 1; i <= passes; i += 1) {
    const day = i * PASS_INTERVAL_DAYS;
    // Logística até o pico (~dia 80) e senescência depois (~dia 110+).
    const rise = targetPeak / (1 + Math.exp(-(day - 45) / 14));
    const senescence = day > 105 ? (day - 105) * 0.012 : 0;
    const noise = (rand() - 0.5) * 0.04;
    const ndvi = Math.max(0.12, Math.min(0.95, rise - senescence + noise));
    const date = new Date(lot.plantingDate.getTime() + day * 24 * 3600 * 1000);
    if (date.getTime() > now.getTime()) break;
    points.push({ date: date.toISOString().slice(0, 10), ndvi: Math.round(ndvi * 100) / 100 });
  }
  if (points.length === 0) return null;

  const peakNdvi = Math.max(...points.map((p) => p.ndvi));
  const factor = YIELD_PER_PEAK_NDVI[lot.grainType];

  // Antes do pico fisiológico a estimativa projeta o pico-alvo; depois usa o observado.
  const projectedPeak = daysSincePlanting < 80 ? Math.max(peakNdvi, targetPeak * 0.95) : peakNdvi;
  const estimated = factor != null ? Math.round(projectedPeak * factor) : null;
  // Confiança aumenta com o avanço do ciclo (±18% no início, ±6% perto da colheita).
  const spreadPct = Math.max(6, 18 - Math.round((daysSincePlanting / CYCLE_DAYS) * 12));
  const range =
    estimated != null
      ? {
          min: Math.round(estimated * (1 - spreadPct / 100)),
          max: Math.round(estimated * (1 + spreadPct / 100)),
        }
      : null;

  return {
    source: 'Sentinel-2 (Copernicus) — simulado no MVP',
    ndviSeries: points,
    peakNdvi,
    estimatedYieldSacksPerHa: estimated,
    yieldRangeSacksPerHa: range,
    note:
      growing && estimated != null
        ? `Estimativa pré-colheita por NDVI (±${spreadPct}%) — confirme o volume antes de ofertar.`
        : 'Série NDVI do ciclo consolidada por passagem quinzenal do satélite.',
  };
}
