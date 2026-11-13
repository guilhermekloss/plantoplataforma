import {
  CloudRain,
  CloudSun,
  ClipboardList,
  FlaskConical,
  Snowflake,
  Sprout,
  Sun,
  Tractor,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { GrainType, HarvestPeriod } from '@plantor/shared';

export type LotStatus =
  | 'em_desenvolvimento'
  | 'colhido'
  | 'em_beneficiamento'
  | 'disponivel'
  | 'ofertado'
  | 'vendido';

export interface FieldOperation {
  date: string;
  type: 'plantio' | 'adubacao' | 'pulverizacao' | 'colheita' | 'outro';
  product: string;
  dosePerHa: number | null;
  unit: string | null;
  costCentsPerHa: number | null;
  source: string | null;
}

export interface SoilAnalysis {
  labName?: string;
  sampleDate?: string;
  pPpm?: number;
  kCmolDm3?: number;
  organicMatterPct?: number;
  ctcCmolDm3?: number;
  baseSaturationPct?: number;
  recommendation?: string;
}

export interface ProductionCost {
  totalCostCentsPerHa?: number;
  source?: string;
  breakdown?: Record<string, number>;
}

export interface StorageInfo {
  siloName?: string;
  grainTempC?: number | null;
  ambientTempC?: number | null;
  aerationOn?: boolean;
  capacitySacks?: number;
  lastReadingAt?: string;
  tempAlert: boolean;
}

export interface SellDecision {
  breakEvenCentsPerSack: number | null;
  totalCostCents: number | null;
  marketPriceCents: number | null;
  marginCentsPerSack: number | null;
  marginPct: number | null;
  verdict: 'margem_boa' | 'margem_apertada' | 'prejuizo' | null;
}

export interface CropTelemetry {
  id: string;
  grainType: GrainType;
  harvestYear: string;
  harvestPeriod: HarvestPeriod;
  status: LotStatus;
  storedMoisturePct: number | null;
  availableSacks: number | null;
  aptToSell: boolean;
  hasOpenOffer: boolean;
  areaHa: number;
  yieldSacksPerHa: number;
  harvestMoisturePct: number | null;
  harvestLossSacksPerHa: number | null;
  plantPopulationPerHa: number | null;
  soilMoisturePct: number | null;
  soilPh: number | null;
  ndviAvg: number | null;
  plantingDate: string | null;
  climate: {
    rainfallMmCycle: number | null;
    gddCycle: number | null;
    avgTempC: number | null;
    frostEvents: number | null;
  };
  machineData: Record<string, unknown> | null;
  yieldMap: { minSc?: number; maxSc?: number; avgSc?: number } | null;
  source: string | null;
  collectedAt: string;
  operations: FieldOperation[] | null;
  soilAnalysis: SoilAnalysis | null;
  productionCost: ProductionCost | null;
  storage: StorageInfo | null;
  decision: SellDecision | null;
  pricing: {
    indicativePriceCents: number | null;
    estimatedTotalSacks: number;
    estimatedGrossValueCents: number | null;
  };
}

export type ForecastCondition = 'sol' | 'parcialmente_nublado' | 'chuva' | 'geada';

export interface ForecastDay {
  date: string;
  tMinC: number;
  tMaxC: number;
  rainMm: number;
  rainProbPct: number;
  condition: ForecastCondition;
}

export interface WeatherAlert {
  level: 'urgente' | 'atencao' | 'info';
  message: string;
  /** 'ia' quando emitido pela análise de risco — a tela de campo mostra o card completo no lugar. */
  source?: 'ia';
  /** Ação de um toque que o alerta habilita (ex.: preço-alvo atingido → criar oferta). */
  action?: 'criar_oferta';
}

export interface WeatherFeed {
  station: string;
  updatedAt: string;
  days: ForecastDay[];
  alerts: WeatherAlert[];
  dryWindow: { startDate: string; days: number } | null;
}

export type ClimateRiskLevel = 'baixo' | 'moderado' | 'alto';

export interface ContractClimateRisk {
  contractId: string;
  contractNumber: string;
  contractStatus: string;
  grainType: GrainType;
  deliveryDeadline: string;
  daysToDeadline: number;
  remainingSacks: number;
  riskScorePct: number;
  riskLevel: ClimateRiskLevel;
  deltaVsYesterdayPts: number;
  drivers: string[];
  recommendation: string;
}

export interface ClimateInsight {
  severity: 'info' | 'atencao' | 'urgente';
  title: string;
  detail: string;
}

export interface ClimateIntelligence {
  engine: {
    model: string;
    updatedAt: string;
    nextRunAt: string;
    runsLast24h: number;
    dataPointsAnalyzed: number;
    sources: string[];
    confidencePct: number;
    note: string;
  };
  rainOutlook: {
    next7dMm: number;
    next15dMm: number;
    normal15dMm: number;
    anomalyPct: number;
    monthLabel: string;
  };
  contractRisks: ContractClimateRisk[];
  insights: ClimateInsight[];
}

export interface MarketQuote {
  grainType: GrainType;
  priceCents: number;
  delta30dPct: number;
  trend: 'alta' | 'queda' | 'estavel';
  series: number[];
}

export interface MarketFeed {
  updatedAt: string;
  source: string;
  quotes: MarketQuote[];
}

export interface HerdGroup {
  category?: string;
  label?: string;
  breed?: string;
  headCount?: number;
  avgWeightKg?: number;
  gmdKgDay?: number | null;
}

export interface LivestockInfo {
  pastureHa?: number;
  source?: string;
  notes?: string;
  herd?: HerdGroup[];
  totalHead: number;
  stockingRateHeadPerHa: number | null;
}

export interface FieldOverview {
  farm: {
    name: string | null;
    region: string;
    hectares: number;
    alqueires: number;
    landUse: { arableHa: number | null; pastureHa: number | null; reserveHa: number | null } | null;
  };
  totals: { estimatedGrossValueCents: number };
  crops: CropTelemetry[];
  weather: WeatherFeed;
  climate: ClimateIntelligence;
  market: MarketFeed;
  livestock: LivestockInfo | null;
}

export const CONDITION_META: Record<ForecastCondition, { icon: LucideIcon; label: string; className: string }> = {
  sol: { icon: Sun, label: 'Sol', className: 'text-amber-500' },
  parcialmente_nublado: { icon: CloudSun, label: 'Parcial', className: 'text-slate-500' },
  chuva: { icon: CloudRain, label: 'Chuva', className: 'text-blue-600' },
  geada: { icon: Snowflake, label: 'Geada', className: 'text-cyan-500' },
};

export const RISK_META: Record<
  ClimateRiskLevel,
  { label: string; badgeClassName: string; barClassName: string }
> = {
  baixo: { label: 'Risco baixo', badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300', barClassName: 'bg-green-500' },
  moderado: { label: 'Risco moderado', badgeClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', barClassName: 'bg-amber-500' },
  alto: { label: 'Risco alto', badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300', barClassName: 'bg-red-500' },
};

export const VERDICT_META: Record<
  NonNullable<SellDecision['verdict']>,
  { label: string; className: string }
> = {
  margem_boa: { label: 'Margem boa', className: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' },
  margem_apertada: { label: 'Margem apertada', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  prejuizo: { label: 'Abaixo do custo', className: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
};

export const OPERATION_META: Record<FieldOperation['type'], { icon: LucideIcon; label: string }> = {
  plantio: { icon: Sprout, label: 'Plantio' },
  adubacao: { icon: FlaskConical, label: 'Adubação' },
  pulverizacao: { icon: Wind, label: 'Pulverização' },
  colheita: { icon: Tractor, label: 'Colheita' },
  outro: { icon: ClipboardList, label: 'Operação' },
};
