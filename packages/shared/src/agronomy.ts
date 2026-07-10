import type { Crop } from "./enums";

/** Alqueire paulista = 2,42 ha (padrão usado no Oeste do PR nos dados de exemplo). */
export const HECTARES_PER_ALQUEIRE = 2.42;

export function alqueiresToHectares(alqueires: number): number {
  return alqueires * HECTARES_PER_ALQUEIRE;
}

export function hectaresToAlqueires(hectares: number): number {
  return hectares / HECTARES_PER_ALQUEIRE;
}

/**
 * Preços de referência INDICATIVOS em centavos por saca de 60kg — não são
 * cotação real (Fase 03 trará oráculos B3/CEPEA). Servem só para o
 * estimador "quanto eu recebo" no /campo.
 */
export const INDICATIVE_PRICE_CENTS: Record<Crop, number> = {
  SOJA: 13_000,
  MILHO: 6_500,
  TRIGO: 8_000,
};

/** Estimativa bruta de receita: produtividade (sc/ha) x área (ha) x preço indicativo/sc. */
export function estimateGrossValueCents(crop: Crop, yieldScHa: number, areaHectares: number): number {
  return Math.round(yieldScHa * areaHectares * INDICATIVE_PRICE_CENTS[crop]);
}
