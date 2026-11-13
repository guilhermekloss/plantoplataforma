import type { GrainType } from './enums.js';

/**
 * Preços de REFERÊNCIA INDICATIVOS por saca (centavos de BRL).
 * NÃO são cotação em tempo real — servem para o produtor ter uma noção de
 * precificação ao analisar o potencial da safra. Na Fase 03 isto vem de
 * oráculos de preço (B3/CEPEA).
 */
export const INDICATIVE_PRICE_CENTS: Partial<Record<GrainType, number>> = {
  soja: 12500, // R$ 125,00 / saca
  milho: 6200, // R$ 62,00 / saca
  trigo: 7800, // R$ 78,00 / saca
  cafe: 130000,
  algodao: 38000,
  sorgo: 4800,
  feijao: 22000,
};

export function indicativePriceCents(grain: GrainType): number | null {
  return INDICATIVE_PRICE_CENTS[grain] ?? null;
}

/**
 * Valor bruto estimado (centavos) = produtividade (sc/ha) × área (ha) × preço/saca (centavos).
 */
export function estimateGrossValueCents(
  yieldSacksPerHa: number,
  areaHa: number,
  pricePerSackCents: number,
): number {
  return Math.round(yieldSacksPerHa * areaHa * pricePerSackCents);
}

/** Produção total estimada em sacas. */
export function estimateTotalSacks(yieldSacksPerHa: number, areaHa: number): number {
  return Math.round(yieldSacksPerHa * areaHa);
}

/**
 * Umidade máxima de CONSERVAÇÃO para armazenamento/comercialização (%).
 * Grão acima disso precisa de secagem antes de ser apto à venda.
 * (Soja/milho ~13–14%, trigo ~13%.)
 */
export const STORAGE_MOISTURE_MAX_PCT: Partial<Record<GrainType, number>> = {
  soja: 14,
  milho: 14,
  trigo: 13,
  cafe: 12,
  algodao: 13,
  sorgo: 13,
  feijao: 14,
};

/** Lote está apto à venda quando a umidade armazenada está na faixa de conservação. */
export function isAptToSell(grain: GrainType, storedMoisturePct: number | null | undefined): boolean {
  if (storedMoisturePct == null) return false;
  const max = STORAGE_MOISTURE_MAX_PCT[grain];
  return max == null ? true : storedMoisturePct <= max;
}

/**
 * Break-even por saca (centavos) = custo total por hectare / produtividade.
 * Abaixo desse preço o produtor vende no prejuízo.
 */
export function breakEvenCentsPerSack(
  totalCostCentsPerHa: number,
  yieldSacksPerHa: number,
): number | null {
  if (yieldSacksPerHa <= 0 || totalCostCentsPerHa <= 0) return null;
  return Math.round(totalCostCentsPerHa / yieldSacksPerHa);
}

/** Margem por saca (centavos) e percentual sobre o preço, dado um break-even. */
export function marginPerSack(
  priceCentsPerSack: number,
  breakEvenCents: number,
): { marginCents: number; marginPct: number } {
  const marginCents = priceCentsPerSack - breakEvenCents;
  return {
    marginCents,
    marginPct: priceCentsPerSack > 0 ? Math.round((marginCents / priceCentsPerSack) * 1000) / 10 : 0,
  };
}

/**
 * Temperatura segura da massa de grãos armazenada (°C). Acima disso há risco
 * de deterioração/fungos e a aeração deve ser ligada.
 */
export const SAFE_GRAIN_TEMP_MAX_C = 30;

/** Conversão usual no PR: 1 alqueire (paulista) = 2,42 ha. */
export const HECTARES_PER_ALQUEIRE = 2.42;

export function alqueiresToHectares(alqueires: number): number {
  return Number((alqueires * HECTARES_PER_ALQUEIRE).toFixed(2));
}
