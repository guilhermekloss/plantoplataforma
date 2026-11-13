import { Injectable } from '@nestjs/common';
import type { FieldReading, Prisma } from '@prisma/client';
import type { GrainType, QualityAdjType } from '@plantor/shared';
import {
  HECTARES_PER_ALQUEIRE,
  SAFE_GRAIN_TEMP_MAX_C,
  breakEvenCentsPerSack,
  calculatePriceAdjustment,
  estimateGrossValueCents,
  estimateTotalSacks,
  indicativePriceCents,
  isAptToSell,
  marginPerSack,
} from '@plantor/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/token.service';
import { openOfferReadingIds } from '../offers/open-offers';
import { marketQuotes } from './providers/market.provider';
import { weatherForecast } from './providers/weather.provider';
import { satelliteView } from './providers/satellite.provider';
import { projectMoistureAt, siloTelemetry, type SiloTelemetry } from './providers/silo.provider';
import { sampleHarvestEvent } from './providers/telemetry.provider';
import { climateIntelligence, type ContractCommitment } from './climate-intelligence';
import type { HarvestEventDto, TargetPriceDto } from './field-data.dto';

function num(v: Prisma.Decimal | null): number | null {
  return v == null ? null : Number(v);
}

export interface StorageJson {
  siloName?: string;
  grainTempC?: number | null;
  ambientTempC?: number | null;
  aerationOn?: boolean;
  capacitySacks?: number;
  lastReadingAt?: string;
}

interface ProductionCostJson {
  totalCostCentsPerHa?: number;
  source?: string;
  breakdown?: Record<string, number>;
}

/** Decisão de venda: preço atual cobre o custo? Com quanto de margem? */
function sellDecision(
  r: FieldReading,
  marketPriceCents: number | null,
): {
  breakEvenCentsPerSack: number | null;
  totalCostCents: number | null;
  marketPriceCents: number | null;
  marginCentsPerSack: number | null;
  marginPct: number | null;
  verdict: 'margem_boa' | 'margem_apertada' | 'prejuizo' | null;
} | null {
  const cost = r.productionCost as ProductionCostJson | null;
  const costPerHa = cost?.totalCostCentsPerHa;
  if (costPerHa == null) return null;
  const yieldSc = Number(r.yieldSacksPerHa);
  const areaHa = Number(r.areaHa);
  const breakEven = breakEvenCentsPerSack(costPerHa, yieldSc);
  const price = marketPriceCents ?? indicativePriceCents(r.grainType);
  const margin = breakEven != null && price != null ? marginPerSack(price, breakEven) : null;
  return {
    breakEvenCentsPerSack: breakEven,
    totalCostCents: Math.round(costPerHa * areaHa),
    marketPriceCents: price,
    marginCentsPerSack: margin?.marginCents ?? null,
    marginPct: margin?.marginPct ?? null,
    verdict:
      margin == null
        ? null
        : margin.marginCents < 0
          ? 'prejuizo'
          : margin.marginPct >= 15
            ? 'margem_boa'
            : 'margem_apertada',
  };
}

/** Grão parado em silo — no secador (em beneficiamento) a massa aquecida faz parte do processo. */
function isStoredGrain(r: FieldReading): boolean {
  return r.status !== 'em_beneficiamento' && r.status !== 'em_desenvolvimento';
}

function storageView(
  r: FieldReading,
  telemetry: SiloTelemetry | null,
): (StorageJson & { tempAlert: boolean; telemetry: SiloTelemetry | null }) | null {
  const s = r.storage as StorageJson | null;
  if (!s || typeof s !== 'object') return null;
  // Temperatura alta só é alerta para grão ARMAZENADO.
  return {
    ...s,
    tempAlert: isStoredGrain(r) && s.grainTempC != null && s.grainTempC > SAFE_GRAIN_TEMP_MAX_C,
    telemetry,
  };
}

/** Contrato em aberto com os termos de qualidade necessários para projetar desconto. */
interface OpenContractTerms {
  id: string;
  contractNumber: string;
  grainType: GrainType;
  deliveryDeadline: Date;
  remainingSacks: number;
  maxMoisturePct: number;
  qualityAdjType: QualityAdjType;
  priceCents: number | null;
}

/** Risco de qualidade na armazenagem: umidade projetada na entrega × cláusula de desconto. */
export interface StorageRisk {
  contractId: string;
  contractNumber: string;
  deliveryDeadline: string; // ISO
  projectedMoisturePct: number;
  maxMoisturePct: number;
  discountPct: number;
  /** Impacto estimado em centavos sobre as sacas ainda a entregar. */
  estDiscountCents: number | null;
  message: string;
}

/**
 * Cruza a tendência do silo com o contrato em aberto de prazo mais próximo da
 * mesma cultura: se a umidade projetada na entrega cair de faixa, quantifica o
 * desconto contratual. Só o Plantor faz esse cruzamento — o sensor sozinho não
 * conhece a cláusula.
 */
function storageRiskFor(
  r: FieldReading,
  telemetry: SiloTelemetry | null,
  contracts: OpenContractTerms[],
  now = new Date(),
): StorageRisk | null {
  if (!telemetry || !isStoredGrain(r)) return null;
  const stored = r.storedMoisturePct != null ? Number(r.storedMoisturePct) : null;
  const candidates = contracts
    .filter((c) => c.grainType === r.grainType)
    .sort((a, b) => a.deliveryDeadline.getTime() - b.deliveryDeadline.getTime());
  for (const c of candidates) {
    const projected = projectMoistureAt(telemetry, stored, c.deliveryDeadline, now);
    if (projected == null) continue;
    const discountPct = calculatePriceAdjustment(
      { maxMoisturePct: c.maxMoisturePct, qualityAdjType: c.qualityAdjType },
      { moisturePct: projected },
    );
    if (discountPct <= 0) continue;
    const sacks =
      r.availableSacks != null ? Math.min(Number(r.availableSacks), c.remainingSacks) : c.remainingSacks;
    const price = c.priceCents ?? indicativePriceCents(r.grainType);
    const estDiscountCents =
      price != null ? Math.round((discountPct / 100) * price * sacks) : null;
    const s = r.storage as StorageJson | null;
    return {
      contractId: c.id,
      contractNumber: c.contractNumber,
      deliveryDeadline: c.deliveryDeadline.toISOString(),
      projectedMoisturePct: projected,
      maxMoisturePct: c.maxMoisturePct,
      discountPct: Math.round(discountPct * 100) / 100,
      estDiscountCents,
      message:
        `Termometria do ${s?.siloName ?? 'silo'}: massa aquecendo (+${telemetry.trend.tempCPerDay}°C/dia). ` +
        `Na entrega do ${c.contractNumber} (${c.deliveryDeadline.toLocaleDateString('pt-BR')}) a umidade projetada é ` +
        `${projected.toLocaleString('pt-BR')}% (máx. contratado ${c.maxMoisturePct}%)` +
        (estDiscountCents != null
          ? ` — desconto estimado de ${(estDiscountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
          : '.') +
        ' Acione a aeração ou antecipe a entrega.',
    };
  }
  return null;
}

function cropView(
  r: FieldReading,
  hasOpenOffer: boolean,
  marketPriceCents: number | null,
  openContracts: OpenContractTerms[],
  now = new Date(),
) {
  const yieldSc = Number(r.yieldSacksPerHa);
  const areaHa = Number(r.areaHa);
  const priceCents = marketPriceCents ?? indicativePriceCents(r.grainType);
  const storedMoisturePct = r.storedMoisturePct != null ? Number(r.storedMoisturePct) : null;
  const availableSacks = r.availableSacks != null ? Number(r.availableSacks) : null;

  const satellite = satelliteView(
    {
      id: r.id,
      grainType: r.grainType as GrainType,
      plantingDate: r.plantingDate,
      ndviAvg: r.ndviAvg != null ? Number(r.ndviAvg) : null,
      status: r.status,
    },
    now,
  );

  const storageJson = r.storage as StorageJson | null;
  const telemetry =
    storageJson && typeof storageJson === 'object' && storageJson.grainTempC != null
      ? siloTelemetry(
          r.id,
          { grainTempC: storageJson.grainTempC, ambientTempC: storageJson.ambientTempC ?? null },
          storedMoisturePct,
          now,
        )
      : null;
  return {
    id: r.id,
    grainType: r.grainType,
    harvestYear: r.harvestYear,
    harvestPeriod: r.harvestPeriod,
    status: r.status,
    storedMoisturePct,
    availableSacks,
    aptToSell: r.status === 'disponivel' && isAptToSell(r.grainType, storedMoisturePct),
    hasOpenOffer,
    areaHa,
    yieldSacksPerHa: yieldSc,
    harvestMoisturePct: num(r.harvestMoisturePct),
    harvestLossSacksPerHa: num(r.harvestLossSacksPerHa),
    plantPopulationPerHa: r.plantPopulationPerHa,
    soilMoisturePct: num(r.soilMoisturePct),
    soilPh: num(r.soilPh),
    ndviAvg: num(r.ndviAvg),
    plantingDate: r.plantingDate?.toISOString() ?? null,
    climate: {
      rainfallMmCycle: num(r.rainfallMmCycle),
      gddCycle: num(r.gddCycle),
      avgTempC: num(r.avgTempC),
      frostEvents: r.frostEvents,
    },
    machineData: r.machineData,
    yieldMap: r.yieldMap,
    source: r.source,
    collectedAt: r.collectedAt.toISOString(),
    // Novas frentes de dados recebidas do campo
    operations: r.operations ?? null,
    soilAnalysis: r.soilAnalysis ?? null,
    productionCost: r.productionCost ?? null,
    satellite,
    storage: storageView(r, telemetry),
    storageRisk: storageRiskFor(r, telemetry, openContracts, now),
    decision: sellDecision(r, marketPriceCents),
    pricing: {
      indicativePriceCents: priceCents,
      estimatedTotalSacks: estimateTotalSacks(yieldSc, areaHa),
      estimatedGrossValueCents: priceCents != null ? estimateGrossValueCents(yieldSc, areaHa, priceCents) : null,
    },
  };
}

@Injectable()
export class FieldDataService {
  constructor(private readonly prisma: PrismaService) {}

  /** Panorama de campo do produtor autenticado (telemetria + clima + mercado + decisão). */
  async overview(user: AccessTokenPayload) {
    // Contratos em aberto do produtor: alimentam a inteligência climática e a
    // projeção de qualidade da armazenagem (umidade na entrega × cláusula).
    const [readings, org, readingsWithOffer, contracts] = await Promise.all([
      this.prisma.fieldReading.findMany({
        where: { organizationId: user.orgId },
        orderBy: [{ collectedAt: 'desc' }],
      }),
      this.prisma.organization.findUnique({
        where: { id: user.orgId },
        select: { name: true, address: true, farmProfile: true, livestock: true },
      }),
      openOfferReadingIds(this.prisma, user.orgId),
      this.prisma.contract.findMany({
        where: {
          sellerId: user.orgId,
          status: { notIn: ['liquidado', 'cancelado', 'disputado'] },
          deliveryDeadline: { gte: new Date() },
        },
        orderBy: { deliveryDeadline: 'asc' },
        select: {
          id: true,
          contractNumber: true,
          status: true,
          grainType: true,
          quantitySacks: true,
          deliveryDeadline: true,
          maxMoisturePct: true,
          qualityAdjType: true,
          priceValueCents: true,
          deliveries: { select: { quantitySacks: true } },
        },
      }),
    ]);

    const grains = Array.from(new Set(readings.map((r) => r.grainType))) as GrainType[];
    const market = marketQuotes(grains);
    const priceByGrain = new Map(market.quotes.map((q) => [q.grainType, q.priceCents]));
    const commitments: ContractCommitment[] = contracts.map((c) => {
      const total = Number(c.quantitySacks);
      const delivered = c.deliveries.reduce((s, d) => s + Number(d.quantitySacks), 0);
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        status: c.status,
        grainType: c.grainType as GrainType,
        quantitySacks: total,
        remainingSacks: Math.max(0, Math.round(total - delivered)),
        deliveryDeadline: c.deliveryDeadline,
      };
    });
    const openContractTerms: OpenContractTerms[] = contracts.map((c, i) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      grainType: c.grainType as GrainType,
      deliveryDeadline: c.deliveryDeadline,
      remainingSacks: commitments[i]!.remainingSacks,
      maxMoisturePct: Number(c.maxMoisturePct),
      qualityAdjType: c.qualityAdjType as QualityAdjType,
      priceCents: c.priceValueCents != null ? Number(c.priceValueCents) : null,
    }));

    const crops = readings.map((r) =>
      cropView(r, readingsWithOffer.has(r.id), priceByGrain.get(r.grainType) ?? null, openContractTerms),
    );
    const maxAreaHa = crops.reduce((m, c) => Math.max(m, c.areaHa), 0);
    const totalEstValueCents = crops.reduce(
      (s, c) => s + (c.pricing.estimatedGrossValueCents ?? 0),
      0,
    );

    const weather = weatherForecast();
    const climate = climateIntelligence(
      commitments,
      readings.map((r) => ({ grainType: r.grainType as GrainType, status: r.status })),
    );

    // O maior risco de contrato vira alerta (aparece no painel); a tela de campo
    // filtra source 'ia' porque mostra o card completo logo abaixo.
    const topRisk = climate.contractRisks[0];
    if (topRisk && topRisk.riskLevel !== 'baixo') {
      weather.alerts.unshift({
        level: topRisk.riskLevel === 'alto' ? 'urgente' : 'atencao',
        source: 'ia',
        message: `IA de clima: risco ${topRisk.riskLevel} para a entrega do ${topRisk.contractNumber} até ${new Date(
          topRisk.deliveryDeadline,
        ).toLocaleDateString('pt-BR')} — veja a análise em Meu campo.`,
      });
    }

    // Alertas de armazenagem entram junto dos climáticos (mesma régua de atenção).
    for (const c of crops) {
      // Projeção de desconto contratual tem prioridade: já inclui a leitura do silo.
      if (c.storageRisk) {
        weather.alerts.push({ level: 'urgente', message: c.storageRisk.message });
      } else if (c.storage?.tempAlert) {
        weather.alerts.push({
          level: 'atencao',
          message: `Grão no ${c.storage.siloName ?? 'silo'} a ${c.storage.grainTempC}°C (limite ${SAFE_GRAIN_TEMP_MAX_C}°C) — mantenha a aeração ligada para evitar perda de qualidade.`,
        });
      }
    }

    // Sinal de venda: cotação cruzou o preço-alvo do produtor (farmProfile.targetPrices).
    const targetPrices =
      ((org?.farmProfile as { targetPrices?: Record<string, number> } | null)?.targetPrices as
        | Record<string, number>
        | undefined) ?? {};
    const quotesWithTarget = market.quotes.map((q) => {
      const target = targetPrices[q.grainType] ?? null;
      const targetHit = target != null && q.priceCents >= target;
      if (targetHit) {
        const lot = crops.find((c) => c.grainType === q.grainType && c.status === 'disponivel');
        const marginNote =
          lot?.decision?.marginCentsPerSack != null
            ? ` Margem de ${(lot.decision.marginCentsPerSack / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/saca sobre o break-even.`
            : '';
        weather.alerts.push({
          level: 'info',
          message:
            `Preço-alvo atingido: ${q.grainType} a ${(q.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/saca ` +
            `(alvo ${(target / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).${marginNote}`,
          // Fecha o loop campo → mercado: a UI transforma o sinal em CTA "criar oferta".
          action: lot ? 'criar_oferta' : undefined,
        });
      }
      return { ...q, targetPriceCents: target, targetHit };
    });
    const marketWithTargets = { ...market, quotes: quotesWithTarget };

    const address = (org?.address as { city?: string; state?: string } | null) ?? null;
    const region = address?.city ? `${address.city}/${address.state ?? ''}` : 'Oeste do Paraná';

    // Perfil da propriedade: quando informado, prevalece sobre a área inferida
    // das lavouras (fazendas grandes têm pasto, reserva e múltiplos talhões).
    const profile = (org?.farmProfile as {
      totalHa?: number;
      arableHa?: number;
      pastureHa?: number;
      reserveHa?: number;
    } | null) ?? null;
    const hectares = profile?.totalHa ?? maxAreaHa;

    // Pecuária (fazenda mista): rebanho + lotação da pastagem
    const livestockJson = (org?.livestock as {
      pastureHa?: number;
      source?: string;
      notes?: string;
      herd?: {
        category?: string;
        label?: string;
        breed?: string;
        headCount?: number;
        avgWeightKg?: number;
        gmdKgDay?: number | null;
      }[];
    } | null) ?? null;
    const totalHead = livestockJson?.herd?.reduce((s, h) => s + (h.headCount ?? 0), 0) ?? 0;
    const livestock = livestockJson
      ? {
          ...livestockJson,
          totalHead,
          stockingRateHeadPerHa:
            livestockJson.pastureHa && livestockJson.pastureHa > 0
              ? Math.round((totalHead / livestockJson.pastureHa) * 100) / 100
              : null,
        }
      : null;

    return {
      farm: {
        name: org?.name ?? null,
        region,
        hectares,
        alqueires: hectares > 0 ? Math.round((hectares / HECTARES_PER_ALQUEIRE) * 10) / 10 : 0,
        landUse: profile
          ? {
              arableHa: profile.arableHa ?? null,
              pastureHa: profile.pastureHa ?? null,
              reserveHa: profile.reserveHa ?? null,
            }
          : null,
      },
      totals: { estimatedGrossValueCents: totalEstValueCents },
      crops,
      weather,
      climate,
      market: marketWithTargets,
      livestock,
    };
  }

  /**
   * Webhook de colheita (formato da OEM — John Deere Operations Center na
   * Fase 03). Idempotente por externalId: o mesmo evento nunca cria dois lotes.
   */
  async ingestHarvestEvent(user: AccessTokenPayload, dto: HarvestEventDto) {
    const existing = await this.prisma.fieldReading.findFirst({
      where: {
        organizationId: user.orgId,
        machineData: { path: ['externalId'], equals: dto.externalId },
      },
      select: { id: true },
    });
    if (existing) return { created: false, fieldReadingId: existing.id };

    const reading = await this.prisma.fieldReading.create({
      data: {
        organizationId: user.orgId,
        grainType: dto.grainType,
        harvestYear: dto.harvestYear,
        harvestPeriod: dto.harvestPeriod,
        areaHa: dto.areaHa,
        yieldSacksPerHa: dto.yieldSacksPerHa,
        harvestMoisturePct: dto.harvestMoisturePct,
        status: 'colhido',
        machineData: {
          externalId: dto.externalId,
          machine: dto.machine,
          fuelLPerHa: dto.fuelLPerHa ?? null,
        },
        source: dto.source ?? 'John Deere Operations Center — simulado no MVP',
        collectedAt: new Date(dto.finishedAt),
      },
    });
    return { created: true, fieldReadingId: reading.id };
  }

  /** Botão "Simular colheita" (dev/demo): gera o evento que a OEM enviaria e o ingere. */
  async simulateHarvest(user: AccessTokenPayload, grainType?: GrainType) {
    const event = sampleHarvestEvent(user.orgId, grainType ?? 'soja');
    const result = await this.ingestHarvestEvent(user, event);
    return { ...result, event };
  }

  /** Define/remove o preço-alvo por cultura (persiste em farmProfile.targetPrices). */
  async setTargetPrice(user: AccessTokenPayload, dto: TargetPriceDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.orgId },
      select: { farmProfile: true },
    });
    const profile =
      org?.farmProfile && typeof org.farmProfile === 'object' && !Array.isArray(org.farmProfile)
        ? (org.farmProfile as Record<string, unknown>)
        : {};
    const targets = {
      ...((profile.targetPrices as Record<string, number> | undefined) ?? {}),
    };
    if (dto.targetPriceCents == null) {
      delete targets[dto.grainType];
    } else {
      targets[dto.grainType] = dto.targetPriceCents;
    }
    await this.prisma.organization.update({
      where: { id: user.orgId },
      data: { farmProfile: { ...profile, targetPrices: targets } as Prisma.InputJsonValue },
    });
    return { targetPrices: targets };
  }
}
