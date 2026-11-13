import { dayKey, formatBrDate, rng } from './simulation';

/**
 * Provider SIMULADO de previsão do tempo.
 * Fase 03: Open-Meteo (previsão, sem chave) com fallback INMET (estações
 * oficiais) — a interface WeatherFeed é o contrato que a integração real
 * implementará; os consumidores não sabem a origem.
 */

export type ForecastCondition = 'sol' | 'parcialmente_nublado' | 'chuva' | 'geada';

export interface ForecastDay {
  date: string; // ISO (yyyy-mm-dd)
  tMinC: number;
  tMaxC: number;
  rainMm: number;
  rainProbPct: number;
  condition: ForecastCondition;
}

export interface WeatherAlert {
  level: 'urgente' | 'atencao' | 'info';
  message: string;
  /** 'ia' quando o alerta é emitido pela análise de risco (a UI de campo mostra o card completo no lugar). */
  source?: 'ia';
  /** Ação de um toque que o alerta habilita na UI (ex.: preço-alvo atingido → criar oferta). */
  action?: 'criar_oferta';
}

export interface WeatherFeed {
  station: string;
  updatedAt: string;
  days: ForecastDay[];
  alerts: WeatherAlert[];
  dryWindow: { startDate: string; days: number } | null;
}

/** Previsão de 7 dias para o Oeste do PR (inverno Cfa: frentes frias + geada ocasional). */
export function weatherForecast(now = new Date()): WeatherFeed {
  const rand = rng(dayKey(now) * 7919);
  const days: ForecastDay[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(now.getTime() + i * 24 * 3600 * 1000);
    const front = rand() < 0.28; // frente fria passando
    const rainMm = front ? Math.round(rand() * 28 + 4) : rand() < 0.18 ? Math.round(rand() * 6) : 0;
    const tMin = front ? Math.round(rand() * 6) : Math.round(6 + rand() * 8);
    const tMax = tMin + Math.round(8 + rand() * 8);
    const frost = tMin <= 2;
    days.push({
      date: date.toISOString().slice(0, 10),
      tMinC: tMin,
      tMaxC: tMax,
      rainMm,
      rainProbPct: rainMm > 0 ? Math.min(95, 40 + Math.round(rainMm * 2)) : Math.round(rand() * 20),
      condition: frost ? 'geada' : rainMm > 2 ? 'chuva' : rainMm > 0 ? 'parcialmente_nublado' : 'sol',
    });
  }

  const alerts: WeatherAlert[] = [];
  const frostDay = days.find((d) => d.condition === 'geada');
  if (frostDay) {
    alerts.push({
      level: 'urgente',
      message: `Risco de geada em ${formatBrDate(frostDay.date)} (mínima ${frostDay.tMinC}°C) — atenção a culturas de inverno em campo.`,
    });
  }
  const heavyRain = days.find((d) => d.rainMm >= 20);
  if (heavyRain) {
    alerts.push({
      level: 'atencao',
      message: `Chuva forte prevista para ${formatBrDate(heavyRain.date)} (${heavyRain.rainMm} mm) — evite colheita e aplicações nesse dia.`,
    });
  }

  // Janela seca: maior sequência de dias com chuva < 2 mm (para colher/aplicar).
  let best: { start: number; len: number } | null = null;
  let cur: { start: number; len: number } | null = null;
  days.forEach((d, i) => {
    if (d.rainMm < 2) {
      cur = cur ? { ...cur, len: cur.len + 1 } : { start: i, len: 1 };
      if (!best || cur.len > best.len) best = cur;
    } else {
      cur = null;
    }
  });
  const dryWindow =
    best && (best as { start: number; len: number }).len >= 2
      ? {
          startDate: days[(best as { start: number; len: number }).start]!.date,
          days: (best as { start: number; len: number }).len,
        }
      : null;

  return {
    station: 'Estação INMET A819 (Cascavel) — simulado no MVP',
    updatedAt: now.toISOString(),
    days,
    alerts,
    dryWindow,
  };
}
