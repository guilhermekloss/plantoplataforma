/**
 * Enums de domínio compartilhados entre web e api.
 *
 * Espelham exatamente os enums do schema Prisma (apps/api/prisma/schema.prisma).
 * Mantê-los aqui como `const` evita que o frontend dependa do client gerado do
 * Prisma só para conhecer os valores de status, tipos de grão, etc.
 */

export const ORG_TYPES = ['cooperative', 'trading', 'producer'] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const USER_ROLES = ['admin', 'operator', 'producer', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CONTRACT_STATUSES = [
  'rascunho',
  'pendente_assinatura_comprador',
  'pendente_assinatura_produtor',
  'assinado',
  'em_execucao',
  'entregue_parcial',
  'disputado',
  'liquidado',
  'cancelado',
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CPR_TYPES = ['fisica', 'financeira'] as const;
export type CprType = (typeof CPR_TYPES)[number];

export const GRAIN_TYPES = ['soja', 'milho', 'cafe', 'trigo', 'algodao', 'sorgo', 'feijao'] as const;
export type GrainType = (typeof GRAIN_TYPES)[number];

export const HARVEST_PERIODS = ['primeira', 'segunda', 'unica'] as const;
export type HarvestPeriod = (typeof HARVEST_PERIODS)[number];

export const GRAIN_GRADES = ['T1', 'T2', 'T3', 'fora_padrao'] as const;
export type GrainGrade = (typeof GRAIN_GRADES)[number];

export const QUALITY_ADJ_TYPES = ['proportional', 'fixed_pct', 'rejection', 'none'] as const;
export type QualityAdjType = (typeof QUALITY_ADJ_TYPES)[number];

export const PRICE_TYPES = ['fixo', 'media_mercado', 'indexado_b3', 'indexado_cbot'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const CURRENCIES = ['BRL', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PRICE_ADJ_INDEXES = ['IPCA', 'IGPM', 'none'] as const;
export type PriceAdjIndex = (typeof PRICE_ADJ_INDEXES)[number];

export const TRANSPORT_RESPS = ['seller', 'buyer'] as const;
export type TransportResp = (typeof TRANSPORT_RESPS)[number];

export const SIGNER_ROLES = ['seller', 'buyer', 'witness'] as const;
export type SignerRole = (typeof SIGNER_ROLES)[number];

export const EVENT_TYPES = [
  'criado',
  'assinado_comprador',
  'assinado_produtor',
  'em_execucao',
  'entregue',
  'entregue_parcial',
  'laudo_anexado',
  'pagamento_liberado',
  'pagamento_pago',
  'disputado',
  'cancelado',
  'hash_registrado_onchain',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const PAYMENT_STATUSES = ['pendente', 'liberado', 'pago'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BLOCKCHAIN_RECORD_TYPES = [
  'contract_registered',
  'status_changed',
  'delivery_confirmed',
  'payment_released',
  'dispute_raised',
] as const;
export type BlockchainRecordType = (typeof BLOCKCHAIN_RECORD_TYPES)[number];

export const PLAN_TYPES = ['trial', 'starter', 'pro', 'enterprise'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];
