import type { Crop, ContractStatus, ContractEventType, OrgType, LoteStatus, OfferStatus } from "@plantor/shared";

export interface OrganizationSummary {
  id: string;
  name: string;
  type: OrgType;
  city: string | null;
  state: string | null;
}

export interface ContractEventItem {
  id: string;
  type: ContractEventType;
  payload: unknown;
  createdAt: string;
  actorUser: { id: string; name: string } | null;
  blockchainTxHash: string | null;
}

export interface ContractListItem {
  id: string;
  number: string;
  crop: Crop;
  status: ContractStatus;
  quantityKg: number;
  totalValueCents: number;
  deliveryDeadline: string;
  buyerOrg: OrganizationSummary;
  sellerOrg: OrganizationSummary;
  createdAt: string;
}

export interface DashboardContractSummary extends ContractListItem {
  counterpartyName: string;
}

export interface DashboardSummary {
  totalContracts: number;
  totalValueCents: number;
  byStatus: Record<ContractStatus, number>;
  upcomingDeadlines: DashboardContractSummary[];
  recentContracts: DashboardContractSummary[];
}

export interface QualityReportItem {
  id: string;
  moisturePct: number;
  impuritiesPct: number;
  brokenGrainsPct: number;
  gradeClass: string;
  discountPct: number;
  discountValueCents: number;
  finalValueCents: number;
}

export interface DeliveryItem {
  id: string;
  quantityKg: number;
  deliveredAt: string;
  paidAt: string | null;
  qualityReport: QualityReportItem | null;
}

export interface FieldReadingItem {
  id: string;
  crop: Crop;
  season: string;
  yieldScHa: number | null;
  harvestMoisture: number | null;
  ndvi: number | null;
  plantPopulation: number | null;
  rainfallMm: number | null;
  gddAccumulated: number | null;
  avgTempC: number | null;
  frostEvents: number | null;
  readingDate: string;
  estimatedRevenuePerHectareCents: number | null;
}

export interface FieldDataOverview {
  readings: FieldReadingItem[];
}

export interface LoteItem {
  id: string;
  crop: Crop;
  season: string;
  areaHectares: number;
  quantityKg: number;
  status: LoteStatus;
  beneficiamentoLocal: string | null;
  createdAt: string;
  offers: { id: string; status: OfferStatus }[];
}

export interface OfferItem {
  id: string;
  organizationId: string;
  loteId: string | null;
  crop: Crop;
  quantityKg: number;
  expectedPriceCents: number | null;
  status: OfferStatus;
  contractId: string | null;
  createdAt: string;
  organization?: OrganizationSummary;
  lote?: LoteItem | null;
}

export interface ContractDetail extends ContractListItem {
  pricePerSc60Cents: number;
  contractHash: string | null;
  signedByBuyerAt: string | null;
  signedBySellerAt: string | null;
  agronomicData: unknown;
  events: ContractEventItem[];
  deliveries: DeliveryItem[];
}
