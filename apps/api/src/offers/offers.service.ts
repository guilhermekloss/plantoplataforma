import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FieldReading, Offer } from '@prisma/client';
import { defaultQualityParams, indicativePriceCents } from '@plantor/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/token.service';
import { ContractsService } from '../contracts/contracts.service';
import type { CreateContractDto } from '../contracts/contracts.dto';
import { qualityFromReading } from '../field-data/providers/quality-score';
import type { CreateOfferDto } from './offers.dto';

/** Defaults de contrato gerado a partir de oferta (MVP — sem negociação de termos). */
const OFFER_CONTRACT_DEFAULTS = {
  sackWeightKg: 60,
  deliveryDays: 90,
  penaltyPct: 10,
  fallbackCity: 'Cascavel',
  fallbackState: 'PR',
} as const;

const OPEN_OFFER_STATUSES = ['disponivel', 'em_negociacao'] as const;

/** Safra corrente no formato AAAA/AAAA+1 (fallback quando a oferta não traz uma válida). */
function currentHarvestYear(now = new Date()): string {
  const year = now.getFullYear();
  return `${year}/${year + 1}`;
}

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsService,
  ) {}

  /** Produtor disponibiliza um lote colhido/apto para venda. */
  async create(user: AccessTokenPayload, dto: CreateOfferDto): Promise<Offer> {
    const reading = await this.prisma.fieldReading.findUnique({
      where: { id: dto.fieldReadingId },
    });
    if (!reading) throw new NotFoundException('Lote não encontrado.');
    if (reading.organizationId !== user.orgId) {
      throw new ForbiddenException('Este lote não pertence à sua propriedade.');
    }
    if (reading.status !== 'disponivel') {
      throw new BadRequestException('O lote ainda não está apto/disponível para venda.');
    }
    const available = reading.availableSacks != null ? Number(reading.availableSacks) : 0;
    const quantity = dto.quantitySacks ?? available;
    if (quantity <= 0 || quantity > available + 1e-9) {
      throw new BadRequestException(`Quantidade inválida. Disponível: ${available} sacas.`);
    }

    const askingPriceCents = dto.askingPriceCents ?? indicativePriceCents(reading.grainType);

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          fieldReadingId: reading.id,
          sellerId: user.orgId,
          grainType: reading.grainType,
          harvestYear: reading.harvestYear,
          quantitySacks: quantity,
          askingPriceCents: askingPriceCents != null ? BigInt(askingPriceCents) : null,
          notes: dto.notes,
          status: 'disponivel',
        },
      });
      await tx.fieldReading.update({ where: { id: reading.id }, data: { status: 'ofertado' } });
      return offer;
    });
  }

  /** Ofertas do produtor autenticado. */
  async mine(user: AccessTokenPayload) {
    return this.prisma.offer.findMany({
      where: { sellerId: user.orgId },
      include: { contract: { select: { id: true, contractNumber: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Mercado: ofertas disponíveis para cooperativas/tradings. */
  async marketplace() {
    const offers = await this.prisma.offer.findMany({
      where: { status: { in: [...OPEN_OFFER_STATUSES] } },
      include: {
        seller: { select: { id: true, name: true, address: true } },
        fieldReading: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return offers.map((o) => ({
      id: o.id,
      grainType: o.grainType,
      harvestYear: o.harvestYear,
      quantitySacks: Number(o.quantitySacks),
      askingPriceCents: o.askingPriceCents != null ? Number(o.askingPriceCents) : null,
      status: o.status,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      seller: {
        id: o.seller.id,
        name: o.seller.name,
        city: addrCity(o.seller.address),
      },
      telemetry: telemetrySummary(o.fieldReading),
      verification: verificationOf(o.fieldReading),
      quality: qualityFromReading(o.fieldReading),
    }));
  }

  /**
   * Dossiê de rastreabilidade do lote por trás de uma oferta aberta: linha do
   * tempo do plantio à armazenagem, montada dos dados de campo já consolidados.
   * Visível para o comprador ANTES de aceitar — é o lastro da negociação.
   */
  async traceability(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { fieldReading: true, seller: { select: { name: true, address: true } } },
    });
    if (!offer) throw new NotFoundException('Oferta não encontrada.');
    return this.traceabilityView(offer);
  }

  /** Mesmo dossiê, acessado a partir do contrato gerado pela oferta. */
  async traceabilityByContract(contractId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { contractId },
      include: { fieldReading: true, seller: { select: { name: true, address: true } } },
    });
    if (!offer) throw new NotFoundException('Este contrato não nasceu de uma oferta rastreada.');
    return this.traceabilityView(offer);
  }

  private traceabilityView(
    offer: Offer & { fieldReading: FieldReading; seller: { name: string; address: unknown } },
  ) {
    const r = offer.fieldReading;

    return {
      offerId: offer.id,
      grainType: offer.grainType,
      harvestYear: r.harvestYear,
      producer: { name: offer.seller.name, city: addrCity(offer.seller.address) },
      areaHa: Number(r.areaHa),
      quality: qualityFromReading(r),
      verification: verificationOf(r),
      timeline: traceabilityTimeline(r),
      climateCycle: {
        rainfallMmCycle: r.rainfallMmCycle != null ? Number(r.rainfallMmCycle) : null,
        avgTempC: r.avgTempC != null ? Number(r.avgTempC) : null,
        gddCycle: r.gddCycle != null ? Number(r.gddCycle) : null,
        frostEvents: r.frostEvents,
      },
      source: r.source,
    };
  }

  /** Cooperativa/trading aceita a oferta → gera um Contract a partir dela. */
  async accept(user: AccessTokenPayload, offerId: string): Promise<{ contractId: string }> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { fieldReading: true },
    });
    if (!offer) throw new NotFoundException('Oferta não encontrada.');

    // Reserva atômica: só um comprador consegue tirar a oferta do estado aberto.
    const claimed = await this.prisma.offer.updateMany({
      where: { id: offerId, status: { in: [...OPEN_OFFER_STATUSES] } },
      data: { status: 'contratada' },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Esta oferta não está mais disponível.');
    }

    try {
      const contract = await this.contracts.create(user, this.contractDtoFromOffer(offer));

      await this.prisma.$transaction(async (tx) => {
        await tx.offer.update({
          where: { id: offer.id },
          data: { contractId: contract.id },
        });
        await tx.fieldReading.update({
          where: { id: offer.fieldReadingId },
          data: { status: 'vendido' },
        });
      });

      // Já envia para assinatura (a oferta partiu do produtor).
      await this.contracts.submit(user, contract.id);
      return { contractId: contract.id };
    } catch (err) {
      // Falhou depois da reserva: devolve a oferta ao mercado.
      await this.prisma.offer.update({
        where: { id: offer.id },
        data: { status: offer.status },
      });
      throw err;
    }
  }

  private contractDtoFromOffer(offer: Offer & { fieldReading: FieldReading }): CreateContractDto {
    const d = OFFER_CONTRACT_DEFAULTS;
    const q = defaultQualityParams(offer.grainType);
    const priceCents =
      offer.askingPriceCents != null
        ? Number(offer.askingPriceCents)
        : indicativePriceCents(offer.grainType);

    return {
      sellerId: offer.sellerId,
      grainType: offer.grainType,
      quantitySacks: Number(offer.quantitySacks),
      sackWeightKg: d.sackWeightKg,
      harvestYear: /^\d{4}\/\d{4}$/.test(offer.harvestYear)
        ? offer.harvestYear
        : currentHarvestYear(),
      harvestPeriod: offer.fieldReading.harvestPeriod,
      maxMoisturePct: q.maxMoisturePct,
      maxImpurityPct: q.maxImpurityPct,
      maxDamagedPct: q.maxDamagedPct,
      minSpecificWeightGL: q.minSpecificWeightGL ?? undefined,
      qualityAdjType: 'proportional',
      priceType: 'fixo',
      priceValueCents: priceCents ?? undefined,
      priceCurrency: 'BRL',
      warehouseName: 'Recebimento da cooperativa',
      warehouseAddress: {
        city: addrCity(offer.fieldReading) ?? d.fallbackCity,
        state: d.fallbackState,
      },
      deliveryDeadline: new Date(Date.now() + d.deliveryDays * 24 * 3600 * 1000),
      transportResponsible: 'seller',
      penaltyPct: d.penaltyPct,
      hasWashoutClause: true,
      hasForceMajeure: true,
    };
  }
}

function addrCity(value: unknown): string | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v.city === 'string') return v.city;
    const addr = v.address;
    if (
      addr &&
      typeof addr === 'object' &&
      typeof (addr as Record<string, unknown>).city === 'string'
    ) {
      return (addr as Record<string, unknown>).city as string;
    }
  }
  return null;
}

function telemetrySummary(r: FieldReading) {
  return {
    yieldSacksPerHa: Number(r.yieldSacksPerHa),
    harvestMoisturePct: r.harvestMoisturePct != null ? Number(r.harvestMoisturePct) : null,
    storedMoisturePct: r.storedMoisturePct != null ? Number(r.storedMoisturePct) : null,
    ndviAvg: r.ndviAvg != null ? Number(r.ndviAvg) : null,
    source: r.source,
  };
}

/**
 * "Lote verificado": derivado dos dados de sensor anexados à leitura de campo
 * (telemetria de máquina, termometria de silo, NDVI de satélite). É o lastro
 * auditável que reduz o risco de qualidade do comprador — mesma lógica da CPR
 * com lastro verificado por sensoriamento.
 */
interface FieldOperationJson {
  date?: string;
  type?: string;
  product?: string;
  dosePerHa?: number;
  unit?: string;
  costCentsPerHa?: number;
  source?: string;
}

export interface TraceabilityEvent {
  date: string | null; // ISO (yyyy-mm-dd) — null quando a fonte não informa
  kind: 'plantio' | 'solo' | 'operacao' | 'colheita' | 'beneficiamento' | 'armazenagem';
  title: string;
  detail: string;
  source: string | null;
}

/**
 * Linha do tempo "da semente ao grão" reconstruída dos dados que máquinas,
 * laboratório e silo já enviaram para a leitura de campo.
 */
function traceabilityTimeline(r: FieldReading): TraceabilityEvent[] {
  const events: TraceabilityEvent[] = [];

  if (r.plantingDate) {
    events.push({
      date: r.plantingDate.toISOString().slice(0, 10),
      kind: 'plantio',
      title: 'Plantio',
      detail: r.plantPopulationPerHa
        ? `População de ${r.plantPopulationPerHa.toLocaleString('pt-BR')} plantas/ha em ${Number(r.areaHa).toLocaleString('pt-BR')} ha.`
        : `Área de ${Number(r.areaHa).toLocaleString('pt-BR')} ha.`,
      source: r.source,
    });
  }

  const soil = r.soilAnalysis as {
    labName?: string;
    sampleDate?: string;
    organicMatterPct?: number;
    baseSaturationPct?: number;
    recommendation?: string;
  } | null;
  if (soil && typeof soil === 'object') {
    events.push({
      date: soil.sampleDate ?? null,
      kind: 'solo',
      title: 'Análise de solo',
      detail: [
        soil.organicMatterPct != null ? `matéria orgânica ${soil.organicMatterPct}%` : null,
        soil.baseSaturationPct != null ? `saturação de bases ${soil.baseSaturationPct}%` : null,
        soil.recommendation ?? null,
      ]
        .filter(Boolean)
        .join(' · '),
      source: soil.labName ?? null,
    });
  }

  const OP_TITLE: Record<string, string> = {
    plantio: 'Plantio',
    adubacao: 'Adubação',
    pulverizacao: 'Pulverização',
    colheita: 'Colheita',
    outro: 'Operação de campo',
  };
  const ops = Array.isArray(r.operations) ? (r.operations as FieldOperationJson[]) : [];
  for (const op of ops) {
    // O plantio como operação duplicaria o marco acima quando há plantingDate.
    if (op.type === 'plantio' && r.plantingDate) continue;
    events.push({
      date: op.date ?? null,
      kind: op.type === 'colheita' ? 'colheita' : 'operacao',
      title: OP_TITLE[op.type ?? 'outro'] ?? 'Operação de campo',
      detail: [
        op.product,
        op.dosePerHa != null
          ? `${op.dosePerHa.toLocaleString('pt-BR')} ${op.unit ?? 'por ha'}`.trim()
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      source: op.source ?? null,
    });
  }

  const machine = r.machineData as { harvester?: string; machine?: string } | null;
  if (!ops.some((o) => o.type === 'colheita') && r.status !== 'em_desenvolvimento') {
    events.push({
      date: r.collectedAt.toISOString().slice(0, 10),
      kind: 'colheita',
      title: 'Colheita',
      detail:
        `${Number(r.yieldSacksPerHa).toLocaleString('pt-BR')} sc/ha` +
        (r.harvestMoisturePct != null
          ? ` · umidade ${Number(r.harvestMoisturePct).toLocaleString('pt-BR')}%`
          : ''),
      source: machine?.harvester ?? machine?.machine ?? r.source,
    });
  }

  if (r.storedMoisturePct != null && r.harvestMoisturePct != null) {
    events.push({
      date: null,
      kind: 'beneficiamento',
      title: 'Secagem e beneficiamento',
      detail: `Umidade de ${Number(r.harvestMoisturePct).toLocaleString('pt-BR')}% na colheita para ${Number(r.storedMoisturePct).toLocaleString('pt-BR')}% armazenado.`,
      source: null,
    });
  }

  const storage = r.storage as {
    siloName?: string;
    grainTempC?: number | null;
    aerationOn?: boolean;
    lastReadingAt?: string;
  } | null;
  if (storage && typeof storage === 'object') {
    events.push({
      date: storage.lastReadingAt ? storage.lastReadingAt.slice(0, 10) : null,
      kind: 'armazenagem',
      title: `Armazenagem${storage.siloName ? ` — ${storage.siloName}` : ''}`,
      detail: [
        storage.grainTempC != null
          ? `massa a ${storage.grainTempC.toLocaleString('pt-BR')}°C`
          : null,
        storage.aerationOn != null
          ? `aeração ${storage.aerationOn ? 'ligada' : 'desligada'}`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      source: 'Termometria do silo',
    });
  }

  // Ordena por data; eventos sem data ficam ao final na ordem de inserção.
  return events.sort((a, b) => {
    if (a.date == null && b.date == null) return 0;
    if (a.date == null) return 1;
    if (b.date == null) return -1;
    return a.date.localeCompare(b.date);
  });
}

function verificationOf(r: FieldReading): {
  level: 'sensores' | 'declarado';
  sources: string[];
} {
  const sources: string[] = [];
  if (r.machineData != null) sources.push('telemetria de máquina');
  if (r.storage != null) sources.push('termometria de silo');
  if (r.ndviAvg != null) sources.push('NDVI de satélite');
  return { level: sources.length >= 2 ? 'sensores' : 'declarado', sources };
}
