import type { GrainType } from '@plantor/shared';
import { dayKey, rng, seedFromText } from './simulation';

/**
 * Provider SIMULADO de telemetria de máquinas.
 * Fase 03: John Deere Operations Center API (OAuth2) e Climate FieldView;
 * multi-marca via IoTag. O webhook real da OEM envia exatamente o formato
 * HarvestEvent — no MVP o evento chega por POST /field-data/events/harvest
 * (seed e botão "Simular colheita" em dev).
 */

export interface HarvestEvent {
  /** Id do evento na OEM — garante idempotência do webhook. */
  externalId: string;
  machine: string;
  grainType: GrainType;
  harvestYear: string;
  harvestPeriod: 'primeira' | 'segunda' | 'unica';
  areaHa: number;
  yieldSacksPerHa: number;
  harvestMoisturePct: number;
  fuelLPerHa: number | null;
  finishedAt: string; // ISO
  source?: string;
}

/** Números plausíveis por cultura (benchmarks DERAL/Conab — PR). */
const YIELD_RANGE: Partial<Record<GrainType, { min: number; max: number; moisture: number }>> = {
  soja: { min: 55, max: 72, moisture: 13.5 },
  milho: { min: 100, max: 135, moisture: 18.5 },
  trigo: { min: 45, max: 62, moisture: 13.2 },
};

/**
 * Evento de colheita de demonstração, determinístico por organização+dia.
 * Usado pelo botão "Simular colheita" em dev — o corpo é o mesmo que a OEM
 * enviaria pelo webhook.
 */
export function sampleHarvestEvent(
  organizationId: string,
  grainType: GrainType = 'soja',
  now = new Date(),
): HarvestEvent {
  const rand = rng(seedFromText(organizationId, now) + grainType.charCodeAt(0));
  const range = YIELD_RANGE[grainType] ?? { min: 50, max: 70, moisture: 14 };
  const year = now.getFullYear();
  return {
    externalId: `jd-${organizationId}-${grainType}-${dayKey(now)}`,
    machine: 'Colheitadeira John Deere S790',
    grainType,
    harvestYear: `${year}/${year + 1}`,
    harvestPeriod: grainType === 'milho' ? 'segunda' : 'unica',
    areaHa: Math.round((18 + rand() * 30) * 10) / 10,
    yieldSacksPerHa: Math.round(range.min + rand() * (range.max - range.min)),
    harvestMoisturePct: Math.round((range.moisture + (rand() - 0.5) * 1.4) * 10) / 10,
    fuelLPerHa: Math.round((10.5 + rand() * 3.5) * 10) / 10,
    finishedAt: now.toISOString(),
    source: 'John Deere Operations Center — simulado no MVP',
  };
}
