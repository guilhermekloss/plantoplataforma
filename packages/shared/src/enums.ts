export const CROPS = ["SOJA", "MILHO", "TRIGO"] as const;
export type Crop = (typeof CROPS)[number];

export const ORG_TYPES = ["COOPERATIVE", "TRADING", "PRODUCER"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const USER_ROLES = ["ADMIN", "OPERATOR", "PRODUCER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CONTRACT_STATUSES = [
  "RASCUNHO",
  "PENDENTE_ASSINATURA",
  "ASSINADO",
  "ENTREGA_PARCIAL",
  "LIQUIDADO",
  "CANCELADO",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_EVENT_TYPES = [
  "CRIADO",
  "STATUS_ALTERADO",
  "ENTREGA_REGISTRADA",
  "LAUDO_ADICIONADO",
  "PAGAMENTO_LIBERADO",
  "ASSINADO",
] as const;
export type ContractEventType = (typeof CONTRACT_EVENT_TYPES)[number];

export const GRADE_CLASSES = ["TIPO_1", "TIPO_2", "TIPO_3", "FORA_DE_TIPO"] as const;
export type GradeClass = (typeof GRADE_CLASSES)[number];

export const OFFER_STATUSES = ["ABERTA", "EM_NEGOCIACAO", "CONVERTIDA", "EXPIRADA", "CANCELADA"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const LOTE_STATUSES = [
  "PLANTADO",
  "COLHIDO",
  "BENEFICIAMENTO",
  "DISPONIVEL",
  "OFERTADO",
  "VENDIDO",
] as const;
export type LoteStatus = (typeof LOTE_STATUSES)[number];

/** Models blind-filtered by tenantId in the Prisma RLS middleware. */
export const TENANT_OWNED_MODELS = ["User", "FieldReading", "Lote", "Offer"] as const;
