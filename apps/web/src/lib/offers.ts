import type { GrainType } from '@plantor/shared';

export type OfferStatus = 'disponivel' | 'em_negociacao' | 'contratada' | 'cancelada';

export interface MyOffer {
  id: string;
  grainType: GrainType;
  harvestYear: string;
  quantitySacks: string;
  askingPriceCents: string | null;
  status: OfferStatus;
  contract: { id: string; contractNumber: string; status: string } | null;
  createdAt: string;
}

export interface QualityFactor {
  label: string;
  deltaPts: number;
  detail: string;
}

export interface GrainQuality {
  score: number; // 0–100
  grade: 'A' | 'B' | 'C';
  confidence: 'alta' | 'media' | 'baixa';
  factors: QualityFactor[];
  source: string;
}

export interface OfferVerification {
  level: 'sensores' | 'declarado';
  sources: string[];
}

export interface MarketplaceOffer {
  id: string;
  grainType: GrainType;
  harvestYear: string;
  quantitySacks: number;
  askingPriceCents: number | null;
  status: OfferStatus;
  notes: string | null;
  createdAt: string;
  seller: { id: string; name: string; city: string | null };
  telemetry: {
    yieldSacksPerHa: number;
    harvestMoisturePct: number | null;
    storedMoisturePct: number | null;
    ndviAvg: number | null;
    source: string | null;
  };
  verification: OfferVerification;
  quality: GrainQuality;
}

export interface TraceabilityEvent {
  date: string | null;
  kind: 'plantio' | 'solo' | 'operacao' | 'colheita' | 'beneficiamento' | 'armazenagem';
  title: string;
  detail: string;
  source: string | null;
}

export interface OfferTraceability {
  offerId: string;
  grainType: GrainType;
  harvestYear: string;
  producer: { name: string; city: string | null };
  areaHa: number;
  quality: GrainQuality;
  verification: OfferVerification;
  timeline: TraceabilityEvent[];
  climateCycle: {
    rainfallMmCycle: number | null;
    avgTempC: number | null;
    gddCycle: number | null;
    frostEvents: number | null;
  };
  source: string | null;
}

export type OfferVerdict = 'preco_justificado' | 'negociavel' | 'acima_do_justo' | 'sem_preco';

export interface OfferEvaluation {
  enabled: boolean;
  verdict: OfferVerdict;
  quality: GrainQuality;
  figures: {
    grainLabel: string;
    quantitySacks: number;
    askingPriceCents: number | null;
    referencePriceCents: number | null;
    qualityAdjPct: number | null;
    fairPriceCents: number | null;
    deltaVsFairCents: number | null;
    totalCents: number | null;
  };
  analysis: string;
}

export interface SuggestedPriceContext {
  referencePriceCents: number;
  qualityAdjPct: number;
  climateAdjPct: number;
  suggestedPriceCents: number;
  breakEvenCentsPerSack: number | null;
  drivers: string[];
}

export interface ContractSuggestion {
  fieldReadingId: string;
  grainType: GrainType;
  grainLabel: string;
  harvestYear: string;
  quantitySacks: number;
  suggestedPriceCents: number;
  priceContext?: SuggestedPriceContext;
  estimatedGrossValueCents: number;
  headline: string;
  rationale: string;
}

export interface SuggestionsResult {
  enabled: boolean;
  suggestions: ContractSuggestion[];
}

export const LOT_STATUS_LABEL: Record<string, string> = {
  em_desenvolvimento: 'Em desenvolvimento',
  colhido: 'Colhido',
  em_beneficiamento: 'Em secagem/beneficiamento',
  disponivel: 'Disponível para venda',
  ofertado: 'Ofertado',
  vendido: 'Vendido',
};

export const LOT_STATUS_BADGE: Record<string, string> = {
  em_desenvolvimento: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  colhido: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  em_beneficiamento: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  disponivel: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  ofertado: 'bg-primary/15 text-primary',
  vendido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
};
