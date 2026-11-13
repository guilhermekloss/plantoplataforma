import type { GrainType } from '@plantor/shared';
import { INDICATIVE_PRICE_CENTS } from '@plantor/shared';
import { dayKey, rng } from './simulation';

/**
 * Provider SIMULADO de cotações de grãos.
 * Fase 03: indicadores diários CEPEA/ESALQ (soja/milho/trigo) e futuros da B3
 * (CCM/SFI) — a interface MarketFeed é o contrato que a integração real
 * implementará.
 */

export interface MarketQuote {
  grainType: GrainType;
  priceCents: number;
  delta30dPct: number;
  trend: 'alta' | 'queda' | 'estavel';
  series: number[]; // últimos 30 dias (centavos/saca)
}

export interface MarketFeed {
  updatedAt: string;
  source: string;
  quotes: MarketQuote[];
}

/** Cotações indicativas com série de 30 dias (passeio determinístico ao redor da referência). */
export function marketQuotes(grains: GrainType[], now = new Date()): MarketFeed {
  const quotes: MarketQuote[] = [];
  for (const grain of grains) {
    const base = INDICATIVE_PRICE_CENTS[grain];
    if (base == null) continue;
    const rand = rng(dayKey(now) * 31 + grain.length * 7 + grain.charCodeAt(0) * 131);
    const series: number[] = [];
    let price = base * (0.96 + rand() * 0.06);
    for (let i = 0; i < 30; i += 1) {
      price = Math.max(base * 0.85, price * (1 + (rand() - 0.48) * 0.012));
      series.push(Math.round(price));
    }
    const first = series[0]!;
    const last = series[series.length - 1]!;
    const delta = Math.round(((last - first) / first) * 1000) / 10;
    quotes.push({
      grainType: grain,
      priceCents: last,
      delta30dPct: delta,
      trend: delta > 1 ? 'alta' : delta < -1 ? 'queda' : 'estavel',
      series,
    });
  }
  return {
    updatedAt: now.toISOString(),
    source: 'Referência indicativa (B3/CEPEA na Fase 03) — simulado no MVP',
    quotes,
  };
}
