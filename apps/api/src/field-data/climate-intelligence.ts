import type { GrainType } from '@plantor/shared';
import { dayKey, rng } from './providers/simulation';
import { weatherForecast, type WeatherFeed } from './providers/weather.provider';

/**
 * "Motor" SIMULADO de inteligência climática: cruza a previsão estendida com os
 * compromissos de contrato do produtor (prazo de entrega, saldo a entregar,
 * cultura em campo) e projeta risco por contrato. No MVP tudo é determinístico
 * por dia — demonstra o comportamento do produto; na Fase 03 entram o provedor
 * climático e o modelo de IA reais.
 */

export interface ContractCommitment {
  id: string;
  contractNumber: string;
  status: string;
  grainType: GrainType;
  quantitySacks: number;
  /** Sacas ainda não entregues (quantidade contratada − entregas registradas). */
  remainingSacks: number;
  deliveryDeadline: Date;
}

export interface CropSignal {
  grainType: GrainType;
  status: string;
}

export type ClimateRiskLevel = 'baixo' | 'moderado' | 'alto';

export interface ContractClimateRisk {
  contractId: string;
  contractNumber: string;
  contractStatus: string;
  grainType: GrainType;
  deliveryDeadline: string; // ISO
  daysToDeadline: number;
  remainingSacks: number;
  riskScorePct: number; // 0–100
  riskLevel: ClimateRiskLevel;
  /** Variação do score vs. a análise de ontem (pontos). */
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
    /** Desvio vs. média histórica do mês (positivo = mais chuvoso). */
    anomalyPct: number;
    monthLabel: string;
  };
  contractRisks: ContractClimateRisk[];
  insights: ClimateInsight[];
}

const DAY_MS = 24 * 3600 * 1000;
const RUN_INTERVAL_MS = 3 * 3600 * 1000; // "análise a cada 3 horas"

/** Média histórica de chuva mensal (mm) — Oeste do PR, aproximação climatológica. */
const NORMAL_RAIN_MM_MONTH = [190, 170, 140, 120, 110, 100, 80, 70, 130, 190, 160, 180];

interface WeatherSignals {
  rain7Mm: number;
  rain15Mm: number;
  normal15Mm: number;
  anomalyPct: number;
  frostAhead: boolean;
  dryWindow: WeatherFeed['dryWindow'];
}

/** Estende a previsão de 7 dias para 15 (dias 8–15 seguem o mesmo clima sintético). */
function weatherSignals(now: Date): WeatherSignals {
  const feed = weatherForecast(now);
  const rain7 = feed.days.reduce((s, d) => s + d.rainMm, 0);
  const rand = rng(dayKey(now) * 104729 + 17);
  let rainExt = 0;
  let frostExt = false;
  for (let i = 7; i < 15; i += 1) {
    const front = rand() < 0.28;
    rainExt += front ? Math.round(rand() * 26 + 4) : rand() < 0.18 ? Math.round(rand() * 6) : 0;
    if (rand() < 0.06) frostExt = true;
  }
  const rain15 = rain7 + rainExt;
  const normal15 = Math.round((NORMAL_RAIN_MM_MONTH[now.getMonth()] ?? 120) / 2);
  return {
    rain7Mm: rain7,
    rain15Mm: rain15,
    normal15Mm: normal15,
    anomalyPct: Math.round(((rain15 - normal15) / normal15) * 100),
    frostAhead: feed.days.some((d) => d.condition === 'geada') || frostExt,
    dryWindow: feed.dryWindow,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
}

function formatBr(d: Date | string): string {
  const iso = typeof d === 'string' ? d : d.toISOString();
  const [y, m, day] = iso.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}

function seedFor(text: string, now: Date): number {
  let h = dayKey(now);
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Score de risco de um contrato para um dia de referência (usado hoje e ontem, para a tendência). */
function scoreContract(
  c: ContractCommitment,
  crops: CropSignal[],
  w: WeatherSignals,
  now: Date,
): { score: number; drivers: string[] } {
  const rand = rng(seedFor(c.contractNumber, now));
  const days = Math.max(0, daysBetween(now, c.deliveryDeadline));
  // Quanto mais perto o prazo, mais a previsão pesa no risco.
  const proximity = days <= 21 ? 1 : days <= 60 ? 0.8 : days <= 120 ? 0.55 : 0.3;

  const drivers: string[] = [];
  let score = 4 + rand() * 6;

  const crop = crops.find((cr) => cr.grainType === c.grainType);
  const cropInField = crop != null && ['em_desenvolvimento', 'colhido', 'em_beneficiamento'].includes(crop.status);

  if (w.anomalyPct >= 20) {
    score += (18 + w.anomalyPct / 4) * proximity;
    drivers.push(
      days <= 60
        ? `Chuva projetada de ${w.rain15Mm} mm em 15 dias (${w.anomalyPct}% acima da média histórica) reduz os dias úteis de colheita e transporte dentro da janela de entrega.`
        : `Padrão persistentemente mais chuvoso que a média (${w.anomalyPct}% acima) pode comprimir a janela de operação conforme o prazo se aproxima.`,
    );
  } else if (w.anomalyPct <= -35 && crop?.status === 'em_desenvolvimento') {
    score += 14 * proximity;
    drivers.push(
      `Chuva projetada ${Math.abs(w.anomalyPct)}% abaixo da média com lavoura em desenvolvimento — risco de quebra de produtividade frente às ${c.quantitySacks.toLocaleString('pt-BR')} sacas contratadas.`,
    );
  }

  if (w.frostAhead && c.grainType === 'trigo' && crop?.status === 'em_desenvolvimento') {
    score += 22;
    drivers.push(
      'Geada prevista no horizonte de análise com trigo em desenvolvimento no campo — risco de dano à espiga e de PH abaixo do mínimo contratado.',
    );
  }

  if (days <= 45 && c.remainingSacks >= 500) {
    const weeks = Math.max(1, Math.round(days / 7));
    score += 6;
    drivers.push(
      `${c.remainingSacks.toLocaleString('pt-BR')} sacas ainda a entregar em ${days} dias — ritmo necessário de ~${Math.ceil(c.remainingSacks / weeks).toLocaleString('pt-BR')} sacas/semana.`,
    );
  }

  return { score: clamp(Math.round(score), 3, 92), drivers };
}

function riskLevel(score: number): ClimateRiskLevel {
  return score >= 55 ? 'alto' : score >= 25 ? 'moderado' : 'baixo';
}

function recommendation(level: ClimateRiskLevel, w: WeatherSignals): string {
  if (level === 'alto') {
    return w.dryWindow
      ? `Antecipe colheita e expedição: a janela seca de ${w.dryWindow.days} dias a partir de ${formatBr(w.dryWindow.startDate)} é a melhor oportunidade antes do prazo. Se a chuva se confirmar, alinhe um aditivo de prazo com o comprador antes do vencimento.`
      : 'Sem janela seca confiável nos próximos 7 dias — reserve capacidade de secagem e alinhe com o comprador um plano B de logística antes do prazo.';
  }
  if (level === 'moderado') {
    return w.dryWindow
      ? `Planeje o transporte para a janela seca de ${w.dryWindow.days} dias a partir de ${formatBr(w.dryWindow.startDate)}. A análise é refeita a cada 3 horas — você será alertado se o risco subir.`
      : 'Acompanhe as próximas análises antes de agendar frete — o padrão de chuva ainda está instável para a janela de entrega.';
  }
  return 'Nenhuma ação necessária agora. A IA segue cruzando previsão e prazo deste contrato a cada 3 horas e alerta se o cenário mudar.';
}

export function climateIntelligence(
  commitments: ContractCommitment[],
  crops: CropSignal[],
  now = new Date(),
): ClimateIntelligence {
  const today = weatherSignals(now);
  const yesterday = new Date(now.getTime() - DAY_MS);
  const signalsYesterday = weatherSignals(yesterday);

  const contractRisks: ContractClimateRisk[] = commitments
    .map((c) => {
      const { score, drivers } = scoreContract(c, crops, today, now);
      const { score: prevScore } = scoreContract(c, crops, signalsYesterday, yesterday);
      const level = riskLevel(score);
      // O clima sintético de ontem é outro sorteio — amortecemos para o delta
      // parecer uma deriva diária plausível, não um salto errático.
      const delta = clamp(score - prevScore, -8, 8);
      return {
        contractId: c.id,
        contractNumber: c.contractNumber,
        contractStatus: c.status,
        grainType: c.grainType,
        deliveryDeadline: c.deliveryDeadline.toISOString(),
        daysToDeadline: Math.max(0, daysBetween(now, c.deliveryDeadline)),
        remainingSacks: c.remainingSacks,
        riskScorePct: score,
        riskLevel: level,
        deltaVsYesterdayPts: delta,
        drivers:
          drivers.length > 0
            ? drivers
            : ['Nenhum sinal climático relevante para esta janela de entrega nas últimas análises.'],
        recommendation: recommendation(level, today),
      };
    })
    .sort((a, b) => b.riskScorePct - a.riskScorePct);

  const insights: ClimateInsight[] = [];
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long' });
  if (today.anomalyPct >= 20) {
    insights.push({
      severity: 'atencao',
      title: `${monthLabel[0]?.toUpperCase()}${monthLabel.slice(1)} mais chuvoso que o normal`,
      detail: `Os modelos projetam ${today.rain15Mm} mm nos próximos 15 dias — ${today.anomalyPct}% acima da média histórica da região. O padrão se repete nas últimas análises e tende a reduzir dias úteis de campo.`,
    });
  } else if (today.anomalyPct <= -35) {
    insights.push({
      severity: 'atencao',
      title: `Quadro seco em ${monthLabel}`,
      detail: `Projeção de apenas ${today.rain15Mm} mm em 15 dias (${Math.abs(today.anomalyPct)}% abaixo da média). Bom para operação de campo; atenção à umidade do solo das lavouras em desenvolvimento.`,
    });
  } else {
    insights.push({
      severity: 'info',
      title: 'Chuva dentro da média para o período',
      detail: `Projeção de ${today.rain15Mm} mm nos próximos 15 dias, próxima da média histórica de ${monthLabel} (${today.normal15Mm} mm na quinzena). Sem desvio relevante detectado.`,
    });
  }
  if (today.dryWindow) {
    insights.push({
      severity: 'info',
      title: `Melhor janela de operação: ${today.dryWindow.days} dias a partir de ${formatBr(today.dryWindow.startDate)}`,
      detail: 'Sequência com baixa probabilidade de chuva — priorize colheita, aplicações e carregamento de frete nesse intervalo.',
    });
  }
  if (today.frostAhead && crops.some((c) => c.grainType === 'trigo' && c.status === 'em_desenvolvimento')) {
    insights.push({
      severity: 'urgente',
      title: 'Geada no horizonte com trigo em campo',
      detail: 'A combinação de massa de ar frio e céu limpo eleva a chance de geada no período analisado. Trigo em desenvolvimento é a cultura mais exposta — acompanhe as mínimas nas próximas análises.',
    });
  }

  const engineRand = rng(dayKey(now) * 15485863 + 3);
  const lastRun = new Date(Math.floor(now.getTime() / RUN_INTERVAL_MS) * RUN_INTERVAL_MS);
  return {
    engine: {
      model: 'Plantor Clima IA v0.3',
      updatedAt: lastRun.toISOString(),
      nextRunAt: new Date(lastRun.getTime() + RUN_INTERVAL_MS).toISOString(),
      runsLast24h: Math.round((24 * 3600 * 1000) / RUN_INTERVAL_MS),
      dataPointsAnalyzed: 11840 + Math.round(engineRand() * 2600),
      sources: [
        'Estação INMET A819 (Cascavel)',
        'ECMWF — ensemble de 15 dias',
        'GFS/NOAA',
        'Satélite GOES-16',
      ],
      confidencePct: 76 + Math.round(engineRand() * 12),
      note: 'Análise simulada no MVP — provedor climático e modelo de IA reais entram na Fase 03.',
    },
    rainOutlook: {
      next7dMm: today.rain7Mm,
      next15dMm: today.rain15Mm,
      normal15dMm: today.normal15Mm,
      anomalyPct: today.anomalyPct,
      monthLabel,
    },
    contractRisks,
    insights,
  };
}
