import type { ContractStatus, EventType, GrainType } from '@plantor/shared';

export interface OrgSummary {
  id: string;
  name: string;
  cpf?: string | null;
  legalName?: string | null;
  email?: string;
  address?: { city?: string; state?: string } | null;
}

export interface ContractSignature {
  id: string;
  signerRole: 'seller' | 'buyer' | 'witness';
  signedAt: string;
  documentHashBefore: string;
  documentHashAfter: string;
  ipAddress: string;
  userAgent: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  status: ContractStatus;
  sellerId: string;
  buyerId: string;
  grainType: GrainType;
  quantitySacks: string;
  sackWeightKg: string;
  harvestYear: string;
  harvestPeriod: 'primeira' | 'segunda' | 'unica';
  maxMoisturePct: string;
  maxImpurityPct: string;
  minSpecificWeightGL: string | null;
  maxDamagedPct: string | null;
  qualityAdjType: 'proportional' | 'fixed_pct' | 'rejection' | 'none';
  priceType: string;
  priceValueCents: string | null;
  priceCurrency: 'BRL' | 'USD';
  advancePct: string | null;
  barterDescription: string | null;
  warehouseName: string;
  warehouseAddress: { street?: string; city?: string; state?: string } | null;
  deliveryDeadline: string;
  transportResponsible: 'seller' | 'buyer';
  penaltyPct: string;
  hasWashoutClause: boolean;
  hasForceMajeure: boolean;
  arbitrationForum: string | null;
  contractHash: string | null;
  blockchainTxHash: string | null;
  agronomicData?: AgronomicData | null;
  signedAt: string | null;
  createdAt: string;
  seller?: OrgSummary;
  buyer?: OrgSummary;
  signatures?: ContractSignature[];
}

export interface AgronomicData {
  source?: string;
  collectedAt?: string;
  expectedYieldSacksPerHa?: number;
  areaHa?: number;
  harvestMoisturePct?: number | null;
  ndviAvg?: number | null;
  soilPh?: number | null;
  climate?: {
    rainfallMmCycle?: number | null;
    gddCycle?: number | null;
    avgTempC?: number | null;
    frostEvents?: number | null;
  };
  reference?: {
    pricePerSackCents?: number | null;
    estimatedTotalSacks?: number;
    estimatedGrossValueCents?: number | null;
    note?: string;
  };
}

export interface QualityReport {
  id: string;
  reportNumber: string;
  laboratoryName: string;
  reportDate: string;
  moisturePct: string;
  impurityPct: string;
  specificWeightGL: string | null;
  damagedPct: string | null;
  grade: 'T1' | 'T2' | 'T3' | 'fora_padrao';
}

export interface Delivery {
  id: string;
  deliveryDate: string;
  quantitySacks: string;
  nfeKey: string | null;
  warehouseReceiptNumber: string | null;
  priceAdjustmentPct: string | null;
  qualityAccepted: boolean | null;
  paymentStatus: 'pendente' | 'liberado' | 'pago';
  paymentAmountCents: string | null;
  qualityReport: QualityReport | null;
}

export interface ContractEvent {
  id: string;
  eventType: EventType;
  description: string;
  createdAt: string;
  blockchainTxHash: string | null;
  performedBy?: { id: string; name: string } | null;
}

// Ícone visual de grão: sempre GrainChip/GrainIcon (components/grain-icon.tsx), nunca emoji.
export const GRAIN_LABELS: Record<GrainType, { label: string }> = {
  soja: { label: 'Soja' },
  milho: { label: 'Milho' },
  cafe: { label: 'Café' },
  trigo: { label: 'Trigo' },
  algodao: { label: 'Algodão' },
  sorgo: { label: 'Sorgo' },
  feijao: { label: 'Feijão' },
};

export const STATUS_LABELS: Record<ContractStatus, string> = {
  rascunho: 'Rascunho',
  pendente_assinatura_comprador: 'Aguardando assinatura do comprador',
  pendente_assinatura_produtor: 'Aguardando assinatura do produtor',
  assinado: 'Assinado',
  em_execucao: 'Em andamento',
  entregue_parcial: 'Entrega parcial',
  disputado: 'Em disputa',
  liquidado: 'Concluído',
  cancelado: 'Cancelado',
};

/** Rótulo simplificado para o produtor (dashboard mobile — Módulo 3). */
export const STATUS_LABELS_PRODUCER: Record<ContractStatus, string> = {
  ...STATUS_LABELS,
  pendente_assinatura_produtor: 'Aguardando sua assinatura',
};

/** Rótulos humanos para valores de enum exibidos no detalhe do contrato. */
export const PRICE_TYPE_LABELS: Record<string, string> = {
  fixo: 'Preço fixo',
  media_mercado: 'Média de mercado na entrega',
};

export const QUALITY_ADJ_LABELS: Record<string, string> = {
  proportional: 'Desconto proporcional ao desvio',
  fixed_pct: 'Desconto de percentual fixo',
  rejection: 'Rejeição do lote',
  none: 'Sem ajuste',
};

export const STATUS_BADGE: Record<ContractStatus, string> = {
  rascunho: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  pendente_assinatura_comprador: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  pendente_assinatura_produtor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  assinado: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  em_execucao: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  entregue_parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
  disputado: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  liquidado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelado: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

// Formatação centralizada em lib/format.ts; re-export mantém os imports existentes.
export { formatMoney, formatSacks, formatDate } from './format';
