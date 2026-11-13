import { HARVEST_PERIODS, defaultQualityParams, type GrainType } from '@plantor/shared';
import type { ProducerSummary } from '@/app/contracts/actions';

export const PERIOD_LABELS: Record<(typeof HARVEST_PERIODS)[number], string> = {
  primeira: 'Primeira',
  segunda: 'Segunda',
  unica: 'Única',
};

export const ADJ_OPTIONS = [
  { value: 'proportional', label: 'Proporcional' },
  { value: 'fixed_pct', label: '% Fixo' },
  { value: 'rejection', label: 'Rejeição' },
  { value: 'none', label: 'Nenhum' },
] as const;

export interface WizardState {
  seller: ProducerSummary | null;
  grainType: GrainType;
  quantitySacks: string;
  harvestYear: string;
  harvestPeriod: (typeof HARVEST_PERIODS)[number];
  maxMoisturePct: string;
  maxImpurityPct: string;
  minSpecificWeightGL: string;
  maxDamagedPct: string;
  qualityAdjType: (typeof ADJ_OPTIONS)[number]['value'];
  priceType: 'fixo' | 'media_mercado';
  pricePerSackReais: string;
  priceCurrency: 'BRL' | 'USD';
  barterEnabled: boolean;
  advancePct: string;
  barterDescription: string;
  warehouseName: string;
  warehouseStreet: string;
  warehouseCity: string;
  warehouseState: string;
  deliveryDeadline: string;
  transportResponsible: 'seller' | 'buyer';
  penaltyPct: string;
  hasWashoutClause: boolean;
  hasForceMajeure: boolean;
  arbitrationForum: string;
}

export function initialState(): WizardState {
  const q = defaultQualityParams('soja');
  return {
    seller: null,
    grainType: 'soja',
    quantitySacks: '',
    harvestYear: '2025/2026',
    harvestPeriod: 'unica',
    maxMoisturePct: String(q.maxMoisturePct),
    maxImpurityPct: String(q.maxImpurityPct),
    minSpecificWeightGL: q.minSpecificWeightGL ? String(q.minSpecificWeightGL) : '',
    maxDamagedPct: String(q.maxDamagedPct),
    qualityAdjType: 'proportional',
    priceType: 'fixo',
    pricePerSackReais: '',
    priceCurrency: 'BRL',
    barterEnabled: false,
    advancePct: '',
    barterDescription: '',
    warehouseName: '',
    warehouseStreet: '',
    warehouseCity: '',
    warehouseState: '',
    deliveryDeadline: '',
    transportResponsible: 'seller',
    penaltyPct: '10',
    hasWashoutClause: true,
    hasForceMajeure: true,
    arbitrationForum: '',
  };
}

export const STEPS = ['Partes', 'Objeto', 'Preço', 'Entrega', 'Revisão'];
export const todayISO = new Date().toISOString().slice(0, 10);

export type StepProps = {
  state: WizardState;
  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
};
