import { rng, seedFromText } from './simulation';

/**
 * Provider SIMULADO de termometria de silo (série temporal).
 * Fase 03: Procer ou QualyAgro (QUALYWireless) — sensores em pêndulos enviam
 * temperatura e umidade intergranular; a integração real devolve o mesmo
 * SiloTelemetry.
 */

export interface SiloReadingPoint {
  at: string; // ISO (yyyy-mm-dd)
  grainTempC: number;
  ambientTempC: number | null;
  intergranularMoisturePct: number | null;
}

export interface SiloTelemetry {
  source: string;
  history: SiloReadingPoint[];
  /** Tendência dos últimos dias (regressão simples sobre a série). */
  trend: {
    tempCPerDay: number;
    moisturePctPerDay: number;
    warming: boolean;
  };
}

const HISTORY_DAYS = 14;

/**
 * Assinatura de aquecimento espontâneo da massa: grão bem acima do ambiente e
 * já em faixa de atividade biológica. É determinística a partir da leitura
 * atual — o silo "conta" se está aquecendo.
 */
function isWarming(grainTempC: number, ambientTempC: number | null): boolean {
  return grainTempC >= 26 && ambientTempC != null && grainTempC - ambientTempC > 5;
}

/**
 * Reconstrói 14 dias de história terminando na leitura atual do silo, com a
 * deriva coerente com a assinatura térmica (aquecendo ≈ +0,4 °C/dia e umidade
 * intergranular subindo; estável ≈ flutuação).
 */
export function siloTelemetry(
  lotId: string,
  current: { grainTempC: number; ambientTempC: number | null },
  storedMoisturePct: number | null,
  now = new Date(),
): SiloTelemetry {
  const warming = isWarming(current.grainTempC, current.ambientTempC);
  const tempDrift = warming ? 0.4 : 0.05;
  const moistureDrift = warming ? 0.06 : 0.005;
  const rand = rng(seedFromText(lotId, now));

  const history: SiloReadingPoint[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const at = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const grainTemp = current.grainTempC - tempDrift * i + (rand() - 0.5) * 0.6;
    const ambient =
      current.ambientTempC != null ? current.ambientTempC + (rand() - 0.5) * 4 : null;
    const moisture =
      storedMoisturePct != null ? storedMoisturePct - moistureDrift * i + (rand() - 0.5) * 0.1 : null;
    history.push({
      at: at.toISOString().slice(0, 10),
      grainTempC: Math.round(grainTemp * 10) / 10,
      ambientTempC: ambient != null ? Math.round(ambient * 10) / 10 : current.ambientTempC,
      intergranularMoisturePct: moisture != null ? Math.round(moisture * 10) / 10 : null,
    });
  }

  return {
    source: 'Termometria do silo (Procer/QualyAgro na Fase 03) — simulado no MVP',
    history,
    trend: {
      tempCPerDay: tempDrift,
      moisturePctPerDay: moistureDrift,
      warming,
    },
  };
}

/** Horizonte máximo de projeção: além disso o produtor já teria agido (aeração/venda). */
const PROJECTION_MAX_DAYS = 60;
/** Deriva total máxima plausível de umidade intergranular (pontos percentuais). */
const PROJECTION_MAX_MOISTURE_GAIN_PCT = 2.5;

/**
 * Projeta a umidade do lote em uma data futura seguindo a tendência do silo.
 * Retorna null quando não há umidade armazenada conhecida.
 */
export function projectMoistureAt(
  telemetry: SiloTelemetry,
  storedMoisturePct: number | null,
  targetDate: Date,
  now = new Date(),
): number | null {
  if (storedMoisturePct == null) return null;
  const days = Math.min(
    PROJECTION_MAX_DAYS,
    Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (24 * 3600 * 1000))),
  );
  const gain = Math.min(PROJECTION_MAX_MOISTURE_GAIN_PCT, telemetry.trend.moisturePctPerDay * days);
  return Math.round((storedMoisturePct + gain) * 10) / 10;
}
