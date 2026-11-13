import {
  Prisma,
  PrismaClient,
  type GrainType,
  type HarvestPeriod,
  type LotStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  alqueiresToHectares,
  estimateGrossValueCents,
  estimateTotalSacks,
  indicativePriceCents,
} from '@plantor/shared';

/**
 * Seed de desenvolvimento e DEMO (apresentação a investidores).
 * - Cooperativa + três produtores (pequeno, misto de grande porte e sítio).
 * - Telemetria de campo (IoT), lavoura em desenvolvimento com NDVI, silo
 *   aquecendo cruzado com cláusula de contrato, preço-alvo com sinal de venda.
 * - Contratos em todos os estados do ciclo: rascunho, pendente de assinatura,
 *   em execução (com entrega parcial + laudo fora do padrão e desconto) e
 *   liquidado (histórico completo de entregas pagas).
 * - Marketplace com ofertas abertas: com selo "verificado por sensores" e
 *   "declarado" (contraste para a demo).
 *
 * O seed é RESTAURADOR: contratos da demo são recriados do zero a cada run
 * (children incluídos), então `npm run db:seed` sempre devolve a base ao
 * estado de apresentação. `npm run db:seed:reset` limpa a base inteira e re-seeda.
 */
const prisma = new PrismaClient();

/**
 * As datas da demo foram escritas tomando 2026-07-03 como "hoje" da apresentação.
 * Para a demo não envelhecer (prazos de contrato vencidos, lavoura "em
 * desenvolvimento" há meses), toda data fixa passa por `demoDate`, que a desloca
 * pelo número de dias entre essa âncora e o dia em que o seed roda. Assim prazos
 * futuros continuam futuros e colheitas passadas continuam no passado.
 */
const DEMO_ANCHOR_MS = Date.UTC(2026, 6, 3);
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_SHIFT_MS = Math.max(0, Math.floor((Date.now() - DEMO_ANCHOR_MS) / DAY_MS) * DAY_MS);

function demoDate(iso: string): Date {
  return new Date(Date.parse(iso) + DEMO_SHIFT_MS);
}

/** Contratos que pertencem à demo — apagados e recriados a cada seed. */
const SEED_CONTRACT_NUMBERS = [
  'PLT-2025-0042',
  'PLT-2026-0001',
  'PLT-2026-0002',
  'PLT-2026-0003',
  'PLT-2026-0004',
  'PLT-2026-0005',
];

/** Remove os contratos da demo (e filhos) para recriação limpa. */
async function resetSeedContracts(): Promise<void> {
  const where = { contract: { contractNumber: { in: SEED_CONTRACT_NUMBERS } } };
  await prisma.qualityReport.deleteMany({ where: { delivery: where } });
  await prisma.delivery.deleteMany({ where });
  await prisma.contractEvent.deleteMany({ where });
  await prisma.contractSignature.deleteMany({ where });
  await prisma.blockchainRecord.deleteMany({ where });
  await prisma.offer.updateMany({
    where: { contract: { contractNumber: { in: SEED_CONTRACT_NUMBERS } } },
    data: { contractId: null },
  });
  await prisma.contract.deleteMany({ where: { contractNumber: { in: SEED_CONTRACT_NUMBERS } } });
}

/** SEED_RESET=1: apaga TUDO (inclusive sobras de e2e) antes de re-seedar. */
async function wipeDatabase(): Promise<void> {
  await prisma.qualityReport.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contractEvent.deleteMany();
  await prisma.contractSignature.deleteMany();
  await prisma.blockchainRecord.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.fieldReading.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

const REGION = 'Oeste do Paraná (Cascavel/Toledo)';
const FARM_ALQUEIRES = 10;
const FARM_HA = alqueiresToHectares(FARM_ALQUEIRES); // 24,2 ha

// Preço-alvo por saca (centavos) — dispara o sinal de venda quando a cotação cruza.
const SJ_FARM_PROFILE = {
  targetPrices: { soja: 12200, trigo: 7900 },
};

interface CropReading {
  grainType: GrainType;
  harvestYear: string;
  harvestPeriod: HarvestPeriod;
  areaHa: number;
  yieldSacksPerHa: number; // colhida ou expectativa (lote em desenvolvimento)
  harvestMoisturePct: number | null;
  harvestLossSacksPerHa: number | null;
  plantingDate: Date;
  plantPopulationPerHa: number;
  soilMoisturePct: number;
  soilPh: number;
  ndviAvg: number;
  rainfallMmCycle: number;
  gddCycle: number;
  avgTempC: number;
  frostEvents: number;
  machineData: Prisma.InputJsonValue;
  yieldMap: Prisma.InputJsonValue | null;
  source: string;
  status: LotStatus;
  storedMoisturePct: number | null;
  availableSacks: number | null;
  operations: Prisma.InputJsonValue;
  soilAnalysis: Prisma.InputJsonValue;
  productionCost: Prisma.InputJsonValue;
  storage: Prisma.InputJsonValue | null;
}

// Dados realistas para o Oeste do PR (benchmarks DERAL/Conab + clima Cfa).
const READINGS: CropReading[] = [
  {
    grainType: 'soja',
    harvestYear: '2024/2025',
    harvestPeriod: 'unica',
    areaHa: FARM_HA,
    yieldSacksPerHa: 62,
    harvestMoisturePct: 13.8,
    harvestLossSacksPerHa: 1.2,
    plantingDate: demoDate('2024-10-05'),
    plantPopulationPerHa: 320000,
    soilMoisturePct: 27,
    soilPh: 5.6,
    ndviAvg: 0.74,
    rainfallMmCycle: 760,
    gddCycle: 1700,
    avgTempC: 24,
    frostEvents: 0,
    machineData: { harvester: 'John Deere S780', fuelLPerHa: 11.5, speedKmh: 6.2, headerWidthM: 9.1, engineHours: 38 },
    yieldMap: { minSc: 48, maxSc: 74, avgSc: 62 },
    source: 'Agregado IoT (John Deere Operations Center + INMET)',
    status: 'disponivel',
    storedMoisturePct: 12.5,
    availableSacks: 1500,
    // Caderno de campo — recebido do app de gestão + máquinas
    operations: [
      { date: '2024-10-05', type: 'plantio', product: 'Soja M6410 IPRO', dosePerHa: 320000, unit: 'sementes/ha', costCentsPerHa: 65000, source: 'Plantadeira (ISOBUS)' },
      { date: '2024-10-05', type: 'adubacao', product: 'MAP 02-30-10', dosePerHa: 300, unit: 'kg/ha', costCentsPerHa: 95000, source: 'Plantadeira (ISOBUS)' },
      { date: '2024-11-12', type: 'pulverizacao', product: 'Herbicida pós-emergente', dosePerHa: 2.5, unit: 'L/ha', costCentsPerHa: 18000, source: 'Pulverizador' },
      { date: '2024-12-05', type: 'pulverizacao', product: 'Fungicida (ferrugem asiática) 1ª', dosePerHa: 0.5, unit: 'L/ha', costCentsPerHa: 32000, source: 'Pulverizador' },
      { date: '2025-01-03', type: 'pulverizacao', product: 'Fungicida 2ª + inseticida (percevejo)', dosePerHa: 0.8, unit: 'L/ha', costCentsPerHa: 38000, source: 'Pulverizador' },
      { date: '2025-02-15', type: 'colheita', product: 'Colheita — John Deere S780', dosePerHa: null, unit: null, costCentsPerHa: 42000, source: 'Colheitadeira' },
    ],
    soilAnalysis: {
      labName: 'Laboratório Solocria (Cascavel)',
      sampleDate: '2024-08-15',
      pPpm: 18,
      kCmolDm3: 0.45,
      organicMatterPct: 3.4,
      ctcCmolDm3: 12.5,
      baseSaturationPct: 62,
      recommendation: 'V% adequada para soja; repor K após a safra para não limitar a safrinha.',
    },
    productionCost: {
      totalCostCentsPerHa: 540000, // R$ 5.400/ha — benchmark Oeste PR
      source: 'Planilha do produtor + benchmark DERAL',
      breakdown: { seedsCents: 65000, fertilizerCents: 150000, chemicalsCents: 140000, operationsCents: 120000, otherCents: 65000 },
    },
    storage: {
      siloName: 'Silo 2 — graneleiro',
      grainTempC: 24,
      ambientTempC: 22,
      aerationOn: false,
      capacitySacks: 2000,
      lastReadingAt: '2026-07-02T22:00:00.000Z',
    },
  },
  {
    grainType: 'milho',
    harvestYear: '2025/2026',
    harvestPeriod: 'segunda',
    areaHa: FARM_HA,
    yieldSacksPerHa: 121,
    harvestMoisturePct: 18.5,
    harvestLossSacksPerHa: 1.8,
    plantingDate: demoDate('2025-02-20'),
    plantPopulationPerHa: 62000,
    soilMoisturePct: 24,
    soilPh: 5.7,
    ndviAvg: 0.71,
    rainfallMmCycle: 470,
    gddCycle: 1520,
    avgTempC: 22.5,
    frostEvents: 1,
    machineData: { harvester: 'New Holland CR8.90', fuelLPerHa: 13.2, speedKmh: 5.8, headerWidthM: 8.7, engineHours: 44 },
    yieldMap: { minSc: 95, maxSc: 138, avgSc: 121 },
    source: 'Agregado IoT (PLM Connect + estação meteorológica)',
    status: 'em_beneficiamento',
    storedMoisturePct: null,
    availableSacks: null,
    operations: [
      { date: '2025-02-20', type: 'plantio', product: 'Milho P3898 (safrinha)', dosePerHa: 62000, unit: 'sementes/ha', costCentsPerHa: 78000, source: 'Plantadeira (ISOBUS)' },
      { date: '2025-02-20', type: 'adubacao', product: 'NPK 08-20-20', dosePerHa: 350, unit: 'kg/ha', costCentsPerHa: 105000, source: 'Plantadeira (ISOBUS)' },
      { date: '2025-03-10', type: 'pulverizacao', product: 'Herbicida (atrazina)', dosePerHa: 4, unit: 'L/ha', costCentsPerHa: 9000, source: 'Pulverizador' },
      { date: '2025-03-20', type: 'adubacao', product: 'Ureia em cobertura', dosePerHa: 200, unit: 'kg/ha', costCentsPerHa: 52000, source: 'Distribuidor' },
      { date: '2025-03-25', type: 'pulverizacao', product: 'Inseticida (cigarrinha) 1ª', dosePerHa: 0.3, unit: 'L/ha', costCentsPerHa: 14000, source: 'Pulverizador' },
      { date: '2025-04-15', type: 'pulverizacao', product: 'Inseticida (cigarrinha) 2ª + fungicida', dosePerHa: 0.6, unit: 'L/ha', costCentsPerHa: 26000, source: 'Pulverizador' },
      { date: '2025-06-28', type: 'colheita', product: 'Colheita — New Holland CR8.90', dosePerHa: null, unit: null, costCentsPerHa: 46000, source: 'Colheitadeira' },
    ],
    soilAnalysis: {
      labName: 'Laboratório Solocria (Cascavel)',
      sampleDate: '2025-01-20',
      pPpm: 16,
      kCmolDm3: 0.38,
      organicMatterPct: 3.2,
      ctcCmolDm3: 12.1,
      baseSaturationPct: 59,
      recommendation: 'K abaixo do ideal após a soja — cobertura com ureia + KCl recomendada.',
    },
    productionCost: {
      totalCostCentsPerHa: 490000, // R$ 4.900/ha
      source: 'Planilha do produtor + benchmark DERAL',
      breakdown: { seedsCents: 78000, fertilizerCents: 157000, chemicalsCents: 90000, operationsCents: 110000, otherCents: 55000 },
    },
    storage: {
      siloName: 'Secador — fluxo contínuo',
      grainTempC: 38,
      ambientTempC: 21,
      aerationOn: true,
      capacitySacks: 3500,
      lastReadingAt: '2026-07-03T04:00:00.000Z',
    },
  },
  {
    grainType: 'trigo',
    harvestYear: '2025/2026',
    harvestPeriod: 'unica',
    areaHa: 12,
    yieldSacksPerHa: 53,
    harvestMoisturePct: 13.2,
    harvestLossSacksPerHa: 1.0,
    plantingDate: demoDate('2025-05-10'),
    plantPopulationPerHa: 3300000,
    soilMoisturePct: 22,
    soilPh: 5.8,
    ndviAvg: 0.66,
    rainfallMmCycle: 510,
    gddCycle: 1300,
    avgTempC: 17,
    frostEvents: 3,
    machineData: { harvester: 'Case IH Axial-Flow', fuelLPerHa: 10.4, speedKmh: 5.2, headerWidthM: 7.6, engineHours: 26 },
    yieldMap: { minSc: 42, maxSc: 61, avgSc: 53 },
    source: 'Agregado IoT (AFS Connect + INMET)',
    status: 'disponivel',
    storedMoisturePct: 12.8,
    availableSacks: 636,
    operations: [
      { date: '2025-05-10', type: 'plantio', product: 'Trigo TBIO Toruk', dosePerHa: 3300000, unit: 'sementes/ha', costCentsPerHa: 42000, source: 'Plantadeira (ISOBUS)' },
      { date: '2025-05-10', type: 'adubacao', product: 'NPK 08-30-20', dosePerHa: 280, unit: 'kg/ha', costCentsPerHa: 88000, source: 'Plantadeira (ISOBUS)' },
      { date: '2025-06-15', type: 'adubacao', product: 'Ureia em cobertura', dosePerHa: 150, unit: 'kg/ha', costCentsPerHa: 39000, source: 'Distribuidor' },
      { date: '2025-07-20', type: 'pulverizacao', product: 'Fungicida (giberela) 1ª', dosePerHa: 0.75, unit: 'L/ha', costCentsPerHa: 24000, source: 'Pulverizador' },
      { date: '2025-08-12', type: 'pulverizacao', product: 'Fungicida (giberela) 2ª', dosePerHa: 0.75, unit: 'L/ha', costCentsPerHa: 24000, source: 'Pulverizador' },
      { date: '2025-09-20', type: 'colheita', product: 'Colheita — Case IH Axial-Flow', dosePerHa: null, unit: null, costCentsPerHa: 38000, source: 'Colheitadeira' },
    ],
    soilAnalysis: {
      labName: 'Laboratório Solocria (Cascavel)',
      sampleDate: '2025-04-02',
      pPpm: 15,
      kCmolDm3: 0.38,
      organicMatterPct: 3.1,
      ctcCmolDm3: 11.8,
      baseSaturationPct: 58,
      recommendation: 'Calagem leve recomendada antes da próxima soja (V% alvo 65).',
    },
    productionCost: {
      totalCostCentsPerHa: 385000, // R$ 3.850/ha
      source: 'Planilha do produtor + benchmark DERAL',
      breakdown: { seedsCents: 42000, fertilizerCents: 127000, chemicalsCents: 66000, operationsCents: 95000, otherCents: 55000 },
    },
    storage: {
      siloName: 'Silo 1 — metálico',
      grainTempC: 31,
      ambientTempC: 24,
      aerationOn: true,
      capacitySacks: 800,
      lastReadingAt: '2026-07-03T03:00:00.000Z',
    },
  },
  {
    // Trigo de inverno 2026/27 — EM DESENVOLVIMENTO (perfilhamento). Alimenta a
    // série NDVI/estimativa pré-colheita e a sugestão de oferta ANTECIPADA da IA.
    grainType: 'trigo',
    harvestYear: '2026/2027',
    harvestPeriod: 'unica',
    areaHa: 12,
    yieldSacksPerHa: 56, // expectativa (histórico + modelo de safra)
    harvestMoisturePct: null,
    harvestLossSacksPerHa: null,
    plantingDate: demoDate('2026-05-15'),
    plantPopulationPerHa: 3300000,
    soilMoisturePct: 28,
    soilPh: 5.8,
    ndviAvg: 0.48, // curva ainda subindo
    rainfallMmCycle: 160,
    gddCycle: 380,
    avgTempC: 14.8,
    frostEvents: 1,
    machineData: { seeder: 'Plantio direto — trator próprio', engineHours: 12 },
    yieldMap: null,
    source: 'Sentinel-2 (NDVI) + INMET',
    status: 'em_desenvolvimento',
    storedMoisturePct: null,
    availableSacks: null,
    operations: [
      { date: '2026-05-15', type: 'plantio', product: 'Trigo TBIO Toruk (12 ha)', dosePerHa: 3300000, unit: 'sementes/ha', costCentsPerHa: 43000, source: 'Plantadeira (ISOBUS)' },
      { date: '2026-05-15', type: 'adubacao', product: 'NPK 08-30-20 na base', dosePerHa: 280, unit: 'kg/ha', costCentsPerHa: 90000, source: 'Plantadeira (ISOBUS)' },
      { date: '2026-06-22', type: 'adubacao', product: 'Ureia em cobertura (perfilhamento)', dosePerHa: 150, unit: 'kg/ha', costCentsPerHa: 40000, source: 'Distribuidor' },
    ],
    soilAnalysis: {
      labName: 'Laboratório Solocria (Cascavel)',
      sampleDate: '2026-04-05',
      pPpm: 17,
      kCmolDm3: 0.4,
      organicMatterPct: 3.2,
      ctcCmolDm3: 12.0,
      baseSaturationPct: 60,
      recommendation: 'Monitorar geada no espigamento (agosto); potencial dentro da média regional.',
    },
    productionCost: {
      totalCostCentsPerHa: 392000, // R$ 3.920/ha (orçado)
      source: 'Planilha do produtor (orçamento da safra)',
      breakdown: { seedsCents: 43000, fertilizerCents: 130000, chemicalsCents: 70000, operationsCents: 94000, otherCents: 55000 },
    },
    storage: null,
  },
];

function agronomicSnapshot(r: CropReading, region = REGION, farmSizeAlqueires = FARM_ALQUEIRES) {
  const priceCents = indicativePriceCents(r.grainType) ?? 0;
  return {
    region,
    farmSizeAlqueires,
    source: r.source,
    expectedYieldSacksPerHa: r.yieldSacksPerHa,
    areaHa: r.areaHa,
    harvestMoisturePct: r.harvestMoisturePct,
    ndviAvg: r.ndviAvg,
    soilPh: r.soilPh,
    climate: {
      rainfallMmCycle: r.rainfallMmCycle,
      gddCycle: r.gddCycle,
      avgTempC: r.avgTempC,
      frostEvents: r.frostEvents,
    },
    reference: {
      pricePerSackCents: priceCents,
      estimatedTotalSacks: estimateTotalSacks(r.yieldSacksPerHa, r.areaHa),
      estimatedGrossValueCents: estimateGrossValueCents(r.yieldSacksPerHa, r.areaHa, priceCents),
      note: 'Preço de referência indicativo — não é cotação em tempo real.',
    },
  };
}

/** Recria as leituras de campo de uma organização (ofertas primeiro — FK). */
async function insertReadings(
  organizationId: string,
  readings: CropReading[],
): Promise<{ grainType: GrainType; harvestYear: string; id: string }[]> {
  await prisma.offer.deleteMany({ where: { sellerId: organizationId } });
  await prisma.fieldReading.deleteMany({ where: { organizationId } });
  const created: { grainType: GrainType; harvestYear: string; id: string }[] = [];
  for (const r of readings) {
    const row = await prisma.fieldReading.create({
      data: {
        organizationId,
        grainType: r.grainType,
        harvestYear: r.harvestYear,
        harvestPeriod: r.harvestPeriod,
        areaHa: r.areaHa,
        yieldSacksPerHa: r.yieldSacksPerHa,
        harvestMoisturePct: r.harvestMoisturePct,
        harvestLossSacksPerHa: r.harvestLossSacksPerHa,
        plantingDate: r.plantingDate,
        plantPopulationPerHa: r.plantPopulationPerHa,
        soilMoisturePct: r.soilMoisturePct,
        soilPh: r.soilPh,
        ndviAvg: r.ndviAvg,
        rainfallMmCycle: r.rainfallMmCycle,
        gddCycle: r.gddCycle,
        avgTempC: r.avgTempC,
        frostEvents: r.frostEvents,
        machineData: r.machineData,
        yieldMap: r.yieldMap ?? Prisma.JsonNull,
        source: r.source,
        status: r.status,
        storedMoisturePct: r.storedMoisturePct,
        availableSacks: r.availableSacks,
        operations: r.operations,
        soilAnalysis: r.soilAnalysis,
        productionCost: r.productionCost,
        storage: r.storage ?? Prisma.JsonNull,
      },
    });
    created.push({ grainType: row.grainType, harvestYear: row.harvestYear, id: row.id });
  }
  return created;
}

/**
 * Publica uma oferta aberta no marketplace a partir de um lote e o marca como
 * `ofertado` — alimenta a tela Mercado da cooperativa na demo.
 */
async function publishOffer(opts: {
  sellerId: string;
  fieldReadingId: string;
  grainType: GrainType;
  harvestYear: string;
  quantitySacks: number;
  askingPriceCents: number;
  notes: string;
}): Promise<void> {
  await prisma.offer.create({
    data: {
      fieldReadingId: opts.fieldReadingId,
      sellerId: opts.sellerId,
      grainType: opts.grainType,
      harvestYear: opts.harvestYear,
      quantitySacks: opts.quantitySacks,
      askingPriceCents: BigInt(opts.askingPriceCents),
      notes: opts.notes,
      status: 'disponivel',
    },
  });
  await prisma.fieldReading.update({
    where: { id: opts.fieldReadingId },
    data: { status: 'ofertado' },
  });
}

// =============================================================================
// Agropecuária Boa Vista — fazenda MISTA de grande porte (10.000 ha, Guarapuava/PR)
// Soja de verão + milho safrinha + trigo de inverno + pecuária de corte.
// Números de referência: DERAL/Conab para os Campos Gerais/Centro-Sul do PR.
// =============================================================================

const BV_REGION = 'Centro-Sul do Paraná (Guarapuava)';
const BV_TOTAL_HA = 10000;
const BV_ALQUEIRES = Math.round(BV_TOTAL_HA / 2.42);

const BV_FARM_PROFILE = {
  totalHa: BV_TOTAL_HA,
  arableHa: 6500,
  pastureHa: 3000,
  reserveHa: 500, // Reserva Legal / APP
  // Preço-alvo por saca (centavos) — dispara o sinal de venda quando a cotação cruza.
  targetPrices: { soja: 12600, milho: 6300 },
};

const BV_LIVESTOCK = {
  pastureHa: 3000,
  source: 'Brincos eletrônicos + balança digital (SISBOV)',
  herd: [
    { category: 'cria', label: 'Matrizes (cria)', breed: 'Nelore × Angus', headCount: 1800, avgWeightKg: 430, gmdKgDay: null },
    { category: 'recria', label: 'Recria', breed: 'Meio-sangue Angus', headCount: 1500, avgWeightKg: 265, gmdKgDay: 0.65 },
    { category: 'engorda', label: 'Engorda (terminação a pasto)', breed: 'Meio-sangue Angus', headCount: 1200, avgWeightKg: 485, gmdKgDay: 0.88 },
  ],
  notes: 'Pastagem de braquiária com sobressemeadura de aveia/azevém no inverno; terminação prevista para o 4º trimestre.',
};

const BV_READINGS: CropReading[] = [
  {
    // Soja de verão 2025/26 — colhida em fev/2026, parte já comercializada
    grainType: 'soja',
    harvestYear: '2025/2026',
    harvestPeriod: 'primeira',
    areaHa: 4000,
    yieldSacksPerHa: 66,
    harvestMoisturePct: 13.5,
    harvestLossSacksPerHa: 1.1,
    plantingDate: demoDate('2025-10-12'),
    plantPopulationPerHa: 310000,
    soilMoisturePct: 26,
    soilPh: 5.9,
    ndviAvg: 0.78,
    rainfallMmCycle: 820,
    gddCycle: 1650,
    avgTempC: 22.8,
    frostEvents: 0,
    machineData: { harvesters: 4, model: 'John Deere S790 (frota)', fuelLPerHa: 12.1, headerWidthM: 12.2, engineHours: 610 },
    yieldMap: { minSc: 51, maxSc: 78, avgSc: 66 },
    source: 'John Deere Operations Center (frota) + INMET',
    status: 'disponivel',
    storedMoisturePct: 12.3,
    availableSacks: 90000, // 264 mil colhidas; 60 mil em contrato, restante em silo
    operations: [
      { date: '2025-10-12', type: 'plantio', product: 'Soja BMX Zeus IPRO (4.000 ha)', dosePerHa: 310000, unit: 'sementes/ha', costCentsPerHa: 68000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2025-10-12', type: 'adubacao', product: 'MAP 11-52-00', dosePerHa: 280, unit: 'kg/ha', costCentsPerHa: 98000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2025-11-18', type: 'pulverizacao', product: 'Herbicida pós-emergente', dosePerHa: 2.2, unit: 'L/ha', costCentsPerHa: 17000, source: 'Pulverizador autopropelido' },
      { date: '2025-12-10', type: 'pulverizacao', product: 'Fungicida (ferrugem) 1ª + micronutrientes', dosePerHa: 0.6, unit: 'L/ha', costCentsPerHa: 34000, source: 'Pulverizador autopropelido' },
      { date: '2026-01-08', type: 'pulverizacao', product: 'Fungicida 2ª + inseticida (percevejo)', dosePerHa: 0.8, unit: 'L/ha', costCentsPerHa: 39000, source: 'Aviação agrícola' },
      { date: '2026-02-19', type: 'colheita', product: 'Colheita — frota S790 (4 máquinas)', dosePerHa: null, unit: null, costCentsPerHa: 45000, source: 'Colheitadeiras' },
    ],
    soilAnalysis: {
      labName: 'Fundação ABC (Guarapuava)',
      sampleDate: '2025-08-20',
      pPpm: 22,
      kCmolDm3: 0.52,
      organicMatterPct: 4.1,
      ctcCmolDm3: 14.2,
      baseSaturationPct: 68,
      recommendation: 'Fertilidade construída — manutenção de P e K conforme exportação; solo de altitude com boa M.O.',
    },
    productionCost: {
      totalCostCentsPerHa: 550000, // R$ 5.500/ha
      source: 'ERP da fazenda (custo realizado)',
      breakdown: { seedsCents: 68000, fertilizerCents: 158000, chemicalsCents: 145000, operationsCents: 121000, otherCents: 58000 },
    },
    storage: {
      siloName: 'Unidade armazenadora própria — graneleiro 1 e 2',
      grainTempC: 23,
      ambientTempC: 14,
      aerationOn: true,
      capacitySacks: 250000,
      lastReadingAt: '2026-07-03T05:00:00.000Z',
    },
  },
  {
    // Milho safrinha 2025/26 — colheita em andamento (jul/2026), secando
    grainType: 'milho',
    harvestYear: '2025/2026',
    harvestPeriod: 'segunda',
    areaHa: 2500,
    yieldSacksPerHa: 118,
    harvestMoisturePct: 19.2,
    harvestLossSacksPerHa: 2.0,
    plantingDate: demoDate('2026-02-25'),
    plantPopulationPerHa: 60000,
    soilMoisturePct: 23,
    soilPh: 5.8,
    ndviAvg: 0.7,
    rainfallMmCycle: 430,
    gddCycle: 1480,
    avgTempC: 20.5,
    frostEvents: 1,
    machineData: { harvesters: 3, model: 'Case IH Axial-Flow 9250', fuelLPerHa: 13.8, headerWidthM: 9.2, engineHours: 240 },
    yieldMap: { minSc: 92, maxSc: 135, avgSc: 118 },
    source: 'AFS Connect (frota) + estação meteorológica própria',
    status: 'em_beneficiamento',
    storedMoisturePct: null,
    availableSacks: null,
    operations: [
      { date: '2026-02-25', type: 'plantio', product: 'Milho DKB 360 PRO4 (2.500 ha)', dosePerHa: 60000, unit: 'sementes/ha', costCentsPerHa: 82000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2026-02-25', type: 'adubacao', product: 'NPK 10-25-25', dosePerHa: 380, unit: 'kg/ha', costCentsPerHa: 112000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2026-03-25', type: 'adubacao', product: 'Ureia protegida em cobertura', dosePerHa: 220, unit: 'kg/ha', costCentsPerHa: 56000, source: 'Distribuidor autopropelido' },
      { date: '2026-04-02', type: 'pulverizacao', product: 'Inseticida (cigarrinha) 1ª', dosePerHa: 0.3, unit: 'L/ha', costCentsPerHa: 14000, source: 'Pulverizador autopropelido' },
      { date: '2026-04-22', type: 'pulverizacao', product: 'Inseticida 2ª + fungicida foliar', dosePerHa: 0.6, unit: 'L/ha', costCentsPerHa: 27000, source: 'Aviação agrícola' },
      { date: '2026-06-30', type: 'colheita', product: 'Colheita em andamento — 60% da área', dosePerHa: null, unit: null, costCentsPerHa: 48000, source: 'Colheitadeiras' },
    ],
    soilAnalysis: {
      labName: 'Fundação ABC (Guarapuava)',
      sampleDate: '2026-01-15',
      pPpm: 19,
      kCmolDm3: 0.44,
      organicMatterPct: 3.9,
      ctcCmolDm3: 13.8,
      baseSaturationPct: 64,
      recommendation: 'Repor K exportado pela soja; N em cobertura parcelado pelo histórico de chuva.',
    },
    productionCost: {
      totalCostCentsPerHa: 500000, // R$ 5.000/ha
      source: 'ERP da fazenda (custo realizado parcial)',
      breakdown: { seedsCents: 82000, fertilizerCents: 168000, chemicalsCents: 82000, operationsCents: 113000, otherCents: 55000 },
    },
    storage: {
      siloName: 'Secador contínuo — unidade própria',
      grainTempC: 40,
      ambientTempC: 12,
      aerationOn: true,
      capacitySacks: 300000,
      lastReadingAt: '2026-07-03T06:00:00.000Z',
    },
  },
  {
    // Trigo de inverno 2026 — EM DESENVOLVIMENTO (plantado em maio/2026)
    grainType: 'trigo',
    harvestYear: '2026/2027',
    harvestPeriod: 'unica',
    areaHa: 1800,
    yieldSacksPerHa: 58, // expectativa (modelo de safra + histórico)
    harvestMoisturePct: null,
    harvestLossSacksPerHa: null,
    plantingDate: demoDate('2026-05-22'),
    plantPopulationPerHa: 3200000,
    soilMoisturePct: 29,
    soilPh: 5.9,
    ndviAvg: 0.52, // perfilhamento — NDVI ainda subindo
    rainfallMmCycle: 180,
    gddCycle: 420,
    avgTempC: 14.5,
    frostEvents: 2,
    machineData: { seeders: 3, model: 'Plantio direto — frota própria', engineHours: 180 },
    yieldMap: null,
    source: 'Sentinel-2 (NDVI) + estação meteorológica própria',
    status: 'em_desenvolvimento',
    storedMoisturePct: null,
    availableSacks: null,
    operations: [
      { date: '2026-05-22', type: 'plantio', product: 'Trigo TBIO Calibre (1.800 ha)', dosePerHa: 3200000, unit: 'sementes/ha', costCentsPerHa: 45000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2026-05-22', type: 'adubacao', product: 'NPK 08-30-20 na base', dosePerHa: 300, unit: 'kg/ha', costCentsPerHa: 94000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2026-06-25', type: 'adubacao', product: 'Ureia em cobertura (perfilhamento)', dosePerHa: 160, unit: 'kg/ha', costCentsPerHa: 42000, source: 'Distribuidor autopropelido' },
    ],
    soilAnalysis: {
      labName: 'Fundação ABC (Guarapuava)',
      sampleDate: '2026-04-10',
      pPpm: 20,
      kCmolDm3: 0.48,
      organicMatterPct: 4.0,
      ctcCmolDm3: 14.0,
      baseSaturationPct: 66,
      recommendation: 'Área apta para trigo de alto potencial; monitorar geada em agosto (espigamento).',
    },
    productionCost: {
      totalCostCentsPerHa: 400000, // R$ 4.000/ha (orçado)
      source: 'ERP da fazenda (orçamento da safra)',
      breakdown: { seedsCents: 45000, fertilizerCents: 136000, chemicalsCents: 70000, operationsCents: 94000, otherCents: 55000 },
    },
    storage: null,
  },
  {
    // Trigo 2025 — safra passada, totalmente comercializada
    grainType: 'trigo',
    harvestYear: '2025/2026',
    harvestPeriod: 'unica',
    areaHa: 1500,
    yieldSacksPerHa: 54,
    harvestMoisturePct: 13.0,
    harvestLossSacksPerHa: 1.2,
    plantingDate: demoDate('2025-05-15'),
    plantPopulationPerHa: 3300000,
    soilMoisturePct: 24,
    soilPh: 5.8,
    ndviAvg: 0.69,
    rainfallMmCycle: 540,
    gddCycle: 1350,
    avgTempC: 15.8,
    frostEvents: 2,
    machineData: { harvesters: 3, model: 'Case IH Axial-Flow 9250', fuelLPerHa: 10.8, headerWidthM: 9.2, engineHours: 150 },
    yieldMap: { minSc: 44, maxSc: 63, avgSc: 54 },
    source: 'AFS Connect (frota) + INMET',
    status: 'vendido',
    storedMoisturePct: 12.6,
    availableSacks: 0,
    operations: [
      { date: '2025-05-15', type: 'plantio', product: 'Trigo TBIO Calibre (1.500 ha)', dosePerHa: 3300000, unit: 'sementes/ha', costCentsPerHa: 44000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2025-06-20', type: 'adubacao', product: 'Ureia em cobertura', dosePerHa: 150, unit: 'kg/ha', costCentsPerHa: 40000, source: 'Distribuidor' },
      { date: '2025-08-05', type: 'pulverizacao', product: 'Fungicida (giberela) 1ª e 2ª', dosePerHa: 1.5, unit: 'L/ha', costCentsPerHa: 46000, source: 'Aviação agrícola' },
      { date: '2025-09-28', type: 'colheita', product: 'Colheita — frota Axial-Flow', dosePerHa: null, unit: null, costCentsPerHa: 39000, source: 'Colheitadeiras' },
    ],
    soilAnalysis: {
      labName: 'Fundação ABC (Guarapuava)',
      sampleDate: '2025-04-08',
      pPpm: 18,
      kCmolDm3: 0.45,
      organicMatterPct: 3.8,
      ctcCmolDm3: 13.5,
      baseSaturationPct: 63,
      recommendation: 'Safra encerrada — resultado dentro do esperado para o ano.',
    },
    productionCost: {
      totalCostCentsPerHa: 390000,
      source: 'ERP da fazenda (custo realizado)',
      breakdown: { seedsCents: 44000, fertilizerCents: 130000, chemicalsCents: 78000, operationsCents: 88000, otherCents: 50000 },
    },
    storage: null,
  },
  {
    // Sorgo safrinha 2025/26 — colhido, seco e OFERTADO no marketplace com dados
    // completos de sensores (telemetria + silo + NDVI → selo "verificado").
    grainType: 'sorgo',
    harvestYear: '2025/2026',
    harvestPeriod: 'segunda',
    areaHa: 700,
    yieldSacksPerHa: 78,
    harvestMoisturePct: 14.8,
    harvestLossSacksPerHa: 1.4,
    plantingDate: demoDate('2026-02-28'),
    plantPopulationPerHa: 180000,
    soilMoisturePct: 22,
    soilPh: 5.7,
    ndviAvg: 0.68,
    rainfallMmCycle: 410,
    gddCycle: 1450,
    avgTempC: 20.1,
    frostEvents: 1,
    machineData: { harvesters: 2, model: 'John Deere S780', fuelLPerHa: 11.9, headerWidthM: 9.1, engineHours: 95 },
    yieldMap: { minSc: 61, maxSc: 90, avgSc: 78 },
    source: 'John Deere Operations Center (frota) + INMET',
    status: 'disponivel',
    storedMoisturePct: 12.4,
    availableSacks: 54600,
    operations: [
      { date: '2026-02-28', type: 'plantio', product: 'Sorgo granífero 50A50 (700 ha)', dosePerHa: 180000, unit: 'sementes/ha', costCentsPerHa: 36000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2026-02-28', type: 'adubacao', product: 'NPK 08-20-20', dosePerHa: 300, unit: 'kg/ha', costCentsPerHa: 88000, source: 'Frota de plantadeiras (ISOBUS)' },
      { date: '2026-04-05', type: 'pulverizacao', product: 'Inseticida (pulgão) + fungicida', dosePerHa: 0.5, unit: 'L/ha', costCentsPerHa: 21000, source: 'Pulverizador autopropelido' },
      { date: '2026-06-24', type: 'colheita', product: 'Colheita — frota S780', dosePerHa: null, unit: null, costCentsPerHa: 41000, source: 'Colheitadeiras' },
    ],
    soilAnalysis: {
      labName: 'Fundação ABC (Guarapuava)',
      sampleDate: '2026-02-01',
      pPpm: 18,
      kCmolDm3: 0.42,
      organicMatterPct: 3.7,
      ctcCmolDm3: 13.2,
      baseSaturationPct: 62,
      recommendation: 'Sequeiro de safrinha — manter cobertura para a soja seguinte.',
    },
    productionCost: {
      totalCostCentsPerHa: 300000, // R$ 3.000/ha
      source: 'ERP da fazenda (custo realizado)',
      breakdown: { seedsCents: 36000, fertilizerCents: 108000, chemicalsCents: 48000, operationsCents: 68000, otherCents: 40000 },
    },
    storage: {
      siloName: 'Graneleiro 3 — unidade própria',
      grainTempC: 22,
      ambientTempC: 13,
      aerationOn: true,
      capacitySacks: 80000,
      lastReadingAt: '2026-07-03T05:30:00.000Z',
    },
  },
];

async function main(): Promise<void> {
  if (process.env.SEED_RESET) {
    // eslint-disable-next-line no-console
    console.log('SEED_RESET=1 — limpando a base inteira (inclusive sobras de e2e)...');
    await wipeDatabase();
  }
  // Contratos da demo sempre nascem limpos — imune a colisão de contractNumber
  // com dados criados pela suíte e2e.
  await resetSeedContracts();

  const passwordHash = await bcrypt.hash('plantor123', 12);

  const cooperative = await prisma.organization.upsert({
    where: { email: 'coop@cotrijal.example' },
    update: {},
    create: {
      tenantId: 'seed-coop',
      id: 'seed-coop',
      type: 'cooperative',
      name: 'Cotrijal (demo)',
      legalName: 'Cooperativa Agropecuária e Industrial Ltda',
      cnpj: '00000000000191',
      email: 'coop@cotrijal.example',
      users: {
        create: {
          email: 'operador@cotrijal.example',
          passwordHash,
          name: 'Operador Cooperativa',
          role: 'admin',
        },
      },
    },
    include: { users: true },
  });

  const producer = await prisma.organization.upsert({
    where: { email: 'produtor@fazenda.example' },
    update: { farmProfile: SJ_FARM_PROFILE },
    create: {
      tenantId: 'seed-producer',
      id: 'seed-producer',
      type: 'producer',
      name: 'Fazenda São João (demo)',
      cpf: '00000000000',
      carNumber: 'PR-1234567-DEMO',
      address: { city: 'Cascavel', state: 'PR', country: 'BR' },
      farmProfile: SJ_FARM_PROFILE,
      email: 'produtor@fazenda.example',
      users: {
        create: {
          email: 'joao@fazenda.example',
          passwordHash,
          name: 'João Produtor',
          role: 'producer',
        },
      },
    },
    include: { users: true },
  });

  const buyerUser = cooperative.users[0];
  if (!buyerUser) throw new Error('Seed: usuário comprador não criado.');

  // ---- Telemetria de campo (IoT) do produtor ----
  const sjLots = await insertReadings(producer.id, READINGS);

  // Oferta aberta no marketplace: lote de trigo com sensores completos
  // (telemetria + silo + NDVI) → selo "verificado por sensores" na demo.
  const sjTrigoLot = sjLots.find((l) => l.grainType === 'trigo' && l.harvestYear === '2025/2026')!;
  await publishOffer({
    sellerId: producer.id,
    fieldReadingId: sjTrigoLot.id,
    grainType: 'trigo',
    harvestYear: '2025/2026',
    quantitySacks: 636,
    askingPriceCents: 7850,
    notes: 'PH 78, seco (12,8%) — retirada na propriedade (Cascavel/PR).',
  });

  // ---- Contratos (soja, milho, trigo) com snapshot agronômico ----
  const soja = READINGS[0]!;
  const milho = READINGS[1]!;
  const trigo = READINGS[2]!;

  const baseQuality = { qualityAdjType: 'proportional' as const };

  // Soja EM EXECUÇÃO com entrega parcial: laudo fora do padrão de umidade →
  // desconto proporcional aplicado automaticamente (Módulo 4 na demo).
  const sjContractSoja = await prisma.contract.create({
    data: {
      tenantId: cooperative.id,
      contractNumber: 'PLT-2026-0001',
      status: 'entregue_parcial',
      sellerId: producer.id,
      buyerId: cooperative.id,
      createdById: buyerUser.id,
      grainType: 'soja',
      quantitySacks: 1000,
      harvestYear: '2024/2025',
      harvestPeriod: 'unica',
      maxMoisturePct: 14.0,
      maxImpurityPct: 1.0,
      minSpecificWeightGL: 660,
      maxDamagedPct: 8.0,
      ...baseQuality,
      priceType: 'fixo',
      priceValueCents: BigInt(indicativePriceCents('soja') ?? 12500),
      priceCurrency: 'BRL',
      warehouseName: 'Armazém Central',
      warehouseAddress: { street: 'Rod. BR-277 km 580', city: 'Cascavel', state: 'PR' },
      deliveryDeadline: demoDate('2026-08-15T00:00:00.000Z'),
      transportResponsible: 'seller',
      signedAt: demoDate('2026-05-20T10:00:00.000Z'),
      executionStartedAt: demoDate('2026-05-20T10:00:00.000Z'),
      agronomicData: agronomicSnapshot(soja),
    },
  });
  const sjDelivery = await prisma.delivery.create({
    data: {
      contractId: sjContractSoja.id,
      deliveryDate: demoDate('2026-06-18T00:00:00.000Z'),
      quantitySacks: 600,
      nfeKey: '41260600000000000191001000009876543210987654',
      warehouseReceiptNumber: 'ROM-2026-04512',
      moisturePct: 14.5,
      impurityPct: 0.9,
      qualityAccepted: true,
      priceAdjustmentPct: 0.35, // 0,5 p.p. de excesso × 0,7 (proporcional)
      paymentAmountCents: BigInt(Math.round(600 * 12500 * (1 - 0.0035))),
      paymentStatus: 'pendente',
    },
  });
  await prisma.qualityReport.create({
    data: {
      deliveryId: sjDelivery.id,
      reportNumber: 'LAB-2026-4471',
      laboratoryName: 'Laboratório Solocria (Cascavel)',
      reportDate: demoDate('2026-06-18T00:00:00.000Z'),
      moisturePct: 14.5,
      impurityPct: 0.9,
      specificWeightGL: 668,
      damagedPct: 4.2,
      grade: 'fora_padrao', // umidade acima de 14% — aceito com desconto
    },
  });

  await prisma.contract.create({
    data: {
      tenantId: cooperative.id,
      contractNumber: 'PLT-2026-0002',
      status: 'rascunho',
      sellerId: producer.id,
      buyerId: cooperative.id,
      createdById: buyerUser.id,
      grainType: 'milho',
      quantitySacks: estimateTotalSacks(milho.yieldSacksPerHa, milho.areaHa), // ~2928
      harvestYear: milho.harvestYear,
      harvestPeriod: 'segunda',
      // MAPA milho (IN 60/2011) — Tipo 1
      maxMoisturePct: 14.0,
      maxImpurityPct: 1.0,
      maxDamagedPct: 6.0,
      ...baseQuality,
      priceType: 'fixo',
      priceValueCents: BigInt(indicativePriceCents('milho') ?? 6200),
      priceCurrency: 'BRL',
      warehouseName: 'Armazém Oeste',
      warehouseAddress: { street: 'Rod. BR-467 km 12', city: 'Toledo', state: 'PR' },
      deliveryDeadline: demoDate('2026-08-31T00:00:00.000Z'),
      transportResponsible: 'seller',
      agronomicData: agronomicSnapshot(milho),
    },
  });

  await prisma.contract.create({
    data: {
      tenantId: cooperative.id,
      contractNumber: 'PLT-2026-0003',
      status: 'rascunho',
      sellerId: producer.id,
      buyerId: cooperative.id,
      createdById: buyerUser.id,
      grainType: 'trigo',
      quantitySacks: estimateTotalSacks(trigo.yieldSacksPerHa, trigo.areaHa), // ~636
      harvestYear: trigo.harvestYear,
      harvestPeriod: 'unica',
      maxMoisturePct: 13.0,
      maxImpurityPct: 1.0,
      maxDamagedPct: 5.0,
      ...baseQuality,
      priceType: 'fixo',
      priceValueCents: BigInt(indicativePriceCents('trigo') ?? 7800),
      priceCurrency: 'BRL',
      warehouseName: 'Armazém Oeste',
      warehouseAddress: { street: 'Rod. BR-467 km 12', city: 'Toledo', state: 'PR' },
      deliveryDeadline: demoDate('2026-11-30T00:00:00.000Z'),
      transportResponsible: 'seller',
      agronomicData: agronomicSnapshot(trigo),
    },
  });

  // ==========================================================================
  // Agropecuária Boa Vista — 10.000 ha (Guarapuava/PR), agricultura + pecuária
  // ==========================================================================
  const bigFarm = await prisma.organization.upsert({
    where: { email: 'fazenda@boavista.example' },
    update: { farmProfile: BV_FARM_PROFILE, livestock: BV_LIVESTOCK },
    create: {
      tenantId: 'seed-bigfarm',
      id: 'seed-bigfarm',
      type: 'producer',
      name: 'Agropecuária Boa Vista (demo)',
      legalName: 'Agropecuária Boa Vista S/A',
      cnpj: '00000000000272',
      carNumber: 'PR-7654321-DEMO',
      address: { city: 'Guarapuava', state: 'PR', country: 'BR' },
      farmProfile: BV_FARM_PROFILE,
      livestock: BV_LIVESTOCK,
      email: 'fazenda@boavista.example',
      users: {
        create: {
          email: 'gerente@boavista.example',
          passwordHash,
          name: 'Ana Gerente',
          role: 'producer',
        },
      },
    },
    include: { users: true },
  });

  const bvLots = await insertReadings(bigFarm.id, BV_READINGS);

  // Oferta aberta de sorgo no marketplace (sensores completos → selo "verificado").
  const bvSorgoLot = bvLots.find((l) => l.grainType === 'sorgo')!;
  await publishOffer({
    sellerId: bigFarm.id,
    fieldReadingId: bvSorgoLot.id,
    grainType: 'sorgo',
    harvestYear: '2025/2026',
    quantitySacks: 50000,
    askingPriceCents: 4900,
    notes: 'Sorgo granífero seco (12,4%), graneleiro próprio — carga programada (Guarapuava/PR).',
  });

  const bvSoja = BV_READINGS[0]!;
  const bvMilho = BV_READINGS[1]!;
  const bvTrigoVendido = BV_READINGS[3]!; // trigo 2025/26 — safra passada, liquidada

  // Contrato de soja em execução (60 mil sacas) com uma entrega de 20 mil já PAGA.
  const bvContractSoja = await prisma.contract.create({
    data: {
      tenantId: cooperative.id,
      contractNumber: 'PLT-2026-0004',
      status: 'em_execucao',
      sellerId: bigFarm.id,
      buyerId: cooperative.id,
      createdById: buyerUser.id,
      grainType: 'soja',
      quantitySacks: 60000,
      harvestYear: '2025/2026',
      harvestPeriod: 'primeira',
      maxMoisturePct: 14.0,
      maxImpurityPct: 1.0,
      minSpecificWeightGL: 660,
      maxDamagedPct: 8.0,
      ...baseQuality,
      priceType: 'fixo',
      priceValueCents: BigInt(12300),
      priceCurrency: 'BRL',
      warehouseName: 'Unidade Cotrijal Guarapuava',
      warehouseAddress: { street: 'Rod. BR-277 km 342', city: 'Guarapuava', state: 'PR' },
      deliveryDeadline: demoDate('2026-09-30T00:00:00.000Z'),
      transportResponsible: 'seller',
      signedAt: demoDate('2026-03-15T14:00:00.000Z'),
      executionStartedAt: demoDate('2026-03-15T14:00:00.000Z'),
      agronomicData: agronomicSnapshot(bvSoja, BV_REGION, BV_ALQUEIRES),
    },
  });

  await prisma.delivery.create({
    data: {
      contractId: bvContractSoja.id,
      deliveryDate: demoDate('2026-06-10T00:00:00.000Z'),
      quantitySacks: 20000,
      nfeKey: '41260600000000027255001000001234567890123456',
      warehouseReceiptNumber: 'ROM-2026-08812',
      moisturePct: 12.6,
      impurityPct: 0.8,
      qualityAccepted: true,
      paymentAmountCents: BigInt(20000 * 12300), // R$ 2,46 mi
      paymentStatus: 'pago',
      paymentReleasedAt: demoDate('2026-06-14T10:00:00.000Z'),
    },
  });

  // Contrato de milho aguardando assinatura do produtor (safrinha em colheita).
  await prisma.contract.create({
    data: {
      tenantId: cooperative.id,
      contractNumber: 'PLT-2026-0005',
      status: 'pendente_assinatura_produtor',
      sellerId: bigFarm.id,
      buyerId: cooperative.id,
      createdById: buyerUser.id,
      grainType: 'milho',
      quantitySacks: 100000,
      harvestYear: '2025/2026',
      harvestPeriod: 'segunda',
      maxMoisturePct: 14.0,
      maxImpurityPct: 1.0,
      maxDamagedPct: 6.0,
      ...baseQuality,
      priceType: 'fixo',
      priceValueCents: BigInt(6000),
      priceCurrency: 'BRL',
      warehouseName: 'Unidade Cotrijal Guarapuava',
      warehouseAddress: { street: 'Rod. BR-277 km 342', city: 'Guarapuava', state: 'PR' },
      deliveryDeadline: demoDate('2026-10-31T00:00:00.000Z'),
      transportResponsible: 'buyer',
      agronomicData: agronomicSnapshot(bvMilho, BV_REGION, BV_ALQUEIRES),
    },
  });

  // Contrato LIQUIDADO (safra passada): ciclo completo com 2 entregas pagas —
  // mostra o histórico/timeline de ponta a ponta na demo.
  const bvContractTrigo = await prisma.contract.create({
    data: {
      tenantId: cooperative.id,
      contractNumber: 'PLT-2025-0042',
      status: 'liquidado',
      sellerId: bigFarm.id,
      buyerId: cooperative.id,
      createdById: buyerUser.id,
      grainType: 'trigo',
      quantitySacks: 81000,
      harvestYear: '2025/2026',
      harvestPeriod: 'unica',
      maxMoisturePct: 13.0,
      maxImpurityPct: 1.0,
      maxDamagedPct: 5.0,
      ...baseQuality,
      priceType: 'fixo',
      priceValueCents: BigInt(7600),
      priceCurrency: 'BRL',
      warehouseName: 'Unidade Cotrijal Guarapuava',
      warehouseAddress: { street: 'Rod. BR-277 km 342', city: 'Guarapuava', state: 'PR' },
      deliveryDeadline: demoDate('2025-11-30T00:00:00.000Z'),
      transportResponsible: 'seller',
      signedAt: demoDate('2025-08-10T09:00:00.000Z'),
      executionStartedAt: demoDate('2025-08-10T09:00:00.000Z'),
      settledAt: demoDate('2025-11-18T16:00:00.000Z'),
      agronomicData: agronomicSnapshot(bvTrigoVendido, BV_REGION, BV_ALQUEIRES),
    },
  });
  await prisma.delivery.createMany({
    data: [
      {
        contractId: bvContractTrigo.id,
        deliveryDate: demoDate('2025-10-22T00:00:00.000Z'),
        quantitySacks: 40000,
        nfeKey: '41251000000000027255001000004567890123456789',
        warehouseReceiptNumber: 'ROM-2025-11204',
        moisturePct: 12.6,
        impurityPct: 0.7,
        qualityAccepted: true,
        paymentAmountCents: BigInt(40000 * 7600),
        paymentStatus: 'pago',
        paymentReleasedAt: demoDate('2025-10-27T10:00:00.000Z'),
      },
      {
        contractId: bvContractTrigo.id,
        deliveryDate: demoDate('2025-11-10T00:00:00.000Z'),
        quantitySacks: 41000,
        nfeKey: '41251100000000027255001000007890123456789012',
        warehouseReceiptNumber: 'ROM-2025-11893',
        moisturePct: 12.4,
        impurityPct: 0.8,
        qualityAccepted: true,
        paymentAmountCents: BigInt(41000 * 7600),
        paymentStatus: 'pago',
        paymentReleasedAt: demoDate('2025-11-14T10:00:00.000Z'),
      },
    ],
  });

  // ==========================================================================
  // Sítio Boa Esperança — pequeno produtor SEM sensores (Toledo/PR).
  // A oferta dele aparece no marketplace como "declarado" — contraste com o
  // selo "verificado por sensores" dos outros dois vendedores.
  // ==========================================================================
  const smallFarm = await prisma.organization.upsert({
    where: { email: 'sitio@boaesperanca.example' },
    update: {},
    create: {
      tenantId: 'seed-sitio',
      id: 'seed-sitio',
      type: 'producer',
      name: 'Sítio Boa Esperança (demo)',
      cpf: '00000000001',
      carNumber: 'PR-2468101-DEMO',
      address: { city: 'Toledo', state: 'PR', country: 'BR' },
      email: 'sitio@boaesperanca.example',
      users: {
        create: {
          email: 'maria@boaesperanca.example',
          passwordHash,
          name: 'Maria Produtora',
          role: 'producer',
        },
      },
    },
  });
  await prisma.offer.deleteMany({ where: { sellerId: smallFarm.id } });
  await prisma.fieldReading.deleteMany({ where: { organizationId: smallFarm.id } });
  const smallLot = await prisma.fieldReading.create({
    data: {
      organizationId: smallFarm.id,
      grainType: 'milho',
      harvestYear: '2025/2026',
      harvestPeriod: 'segunda',
      areaHa: 18,
      yieldSacksPerHa: 105,
      harvestMoisturePct: 16.0,
      storedMoisturePct: 13.5,
      source: 'Declarado pelo produtor',
      status: 'disponivel',
      availableSacks: 1890,
    },
  });
  await publishOffer({
    sellerId: smallFarm.id,
    fieldReadingId: smallLot.id,
    grainType: 'milho',
    harvestYear: '2025/2026',
    quantitySacks: 1890,
    askingPriceCents: 6100,
    notes: 'Milho safrinha seco em terceiros — retirada em Toledo/PR.',
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seed/demo concluído:\n` +
      `- Cooperativa Cotrijal + 3 produtores (São João ${FARM_ALQUEIRES} alqueires/${REGION}; ` +
      `Boa Vista ${BV_TOTAL_HA} ha/${BV_REGION} com ${BV_LIVESTOCK.herd.reduce((s, h) => s + h.headCount, 0)} cabeças; ` +
      `Sítio Boa Esperança 18 ha/Toledo)\n` +
      `- ${READINGS.length + BV_READINGS.length + 1} lotes de campo (inclui 2 lavouras em desenvolvimento com NDVI e silo aquecendo com alerta de desconto)\n` +
      `- ${SEED_CONTRACT_NUMBERS.length} contratos cobrindo o ciclo: rascunho, pendente de assinatura, em execução (entrega paga), ` +
      `entregue parcial (laudo fora do padrão + desconto 0,35%) e liquidado (2 entregas pagas)\n` +
      `- 3 ofertas abertas no marketplace (2 com selo "verificado por sensores", 1 "declarado")\n` +
      `- Preços-alvo definidos (sinal de venda da soja dispara na demo)\n` +
      `Logins (senha plantor123): operador@cotrijal.example · joao@fazenda.example · gerente@boavista.example · maria@boaesperanca.example`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
