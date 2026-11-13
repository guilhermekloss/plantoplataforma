import type { ContractStatus, GrainType } from '@plantor/shared';

export type AlertLevel = 'urgente' | 'atencao' | 'pendente' | 'acao';

export interface DashboardAlert {
  level: AlertLevel;
  message: string;
  contractId: string;
  contractNumber: string;
}

export interface DashboardSummary {
  orgType: 'buyer' | 'producer';
  kpis: {
    activeContracts: number;
    committedSacksMonth: number;
    openValueCents: string;
    deliveriesDue30: number;
  };
  alerts: DashboardAlert[];
  statusDistribution: { status: ContractStatus; count: number }[];
  recentContracts: {
    id: string;
    contractNumber: string;
    status: ContractStatus;
    grainType: GrainType;
    quantitySacks: string;
    deliveryDeadline: string;
    counterpartyName?: string | null;
  }[];
  producer: {
    toSign: number;
    pendingDeliveries: number;
    totalContracts: number;
    soldSacks: number;
    contractedValueCents: string;
    receivedCents: string;
    receivableCents: string;
  };
  buyer: {
    openMarketOffers: number;
    purchasesByGrain: {
      grainType: GrainType;
      sacks: number;
      avgPriceCents: number | null;
      refPriceCents: number | null;
    }[];
  };
}
