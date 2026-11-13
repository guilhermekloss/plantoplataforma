import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * Telemetria de campo (IoT) + estimativa de precificação do produtor:
 * NDVI de satélite (estimativa pré-colheita), termometria de silo × cláusula
 * de desconto do contrato e sinal de venda por preço-alvo.
 */
const prisma = new PrismaClient();
let app: INestApplication;
const api = () => request(app.getHttpServer());

let producer: { token: string; orgId: string };
let coop: { token: string; orgId: string };

async function registerOrg(type: 'cooperative' | 'producer', email: string) {
  const res = await api()
    .post('/api/auth/register')
    .send({ name: type, email, password: 'senha12345', type, acceptedTerms: true })
    .expect(201);
  return { token: res.body.accessToken as string, orgId: res.body.user.organizationId as string };
}

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();

  await prisma.offer.deleteMany();
  await prisma.fieldReading.deleteMany();
  await prisma.qualityReport.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contractEvent.deleteMany();
  await prisma.contractSignature.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  producer = await registerOrg('producer', 'fd@field.local');
  coop = await registerOrg('cooperative', 'coop@field.local');

  // Soja: colhida, seca e disponível (apta), com silo AQUECENDO (29°C vs 18°C
  // ambiente — assinatura de aquecimento espontâneo da massa).
  await prisma.fieldReading.create({
    data: {
      organizationId: producer.orgId,
      grainType: 'soja',
      harvestYear: '2024/2025',
      harvestPeriod: 'unica',
      areaHa: 24.2,
      yieldSacksPerHa: 62,
      harvestMoisturePct: 13.8,
      storedMoisturePct: 12.5,
      status: 'disponivel',
      availableSacks: 1500,
      storage: {
        siloName: 'Silo 2',
        grainTempC: 29,
        ambientTempC: 18,
        aerationOn: false,
        capacitySacks: 2000,
      },
    },
  });
  // Milho: ainda em beneficiamento.
  await prisma.fieldReading.create({
    data: {
      organizationId: producer.orgId,
      grainType: 'milho',
      harvestYear: '2025/2026',
      harvestPeriod: 'segunda',
      areaHa: 24.2,
      yieldSacksPerHa: 121,
      harvestMoisturePct: 18.5,
      status: 'em_beneficiamento',
    },
  });
  // Trigo: EM DESENVOLVIMENTO, plantado há 60 dias — alvo do NDVI de satélite.
  await prisma.fieldReading.create({
    data: {
      organizationId: producer.orgId,
      grainType: 'trigo',
      harvestYear: '2026/2027',
      harvestPeriod: 'unica',
      areaHa: 12,
      yieldSacksPerHa: 55, // expectativa
      plantingDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      ndviAvg: 0.5,
      status: 'em_desenvolvimento',
    },
  });

  // Contrato de soja em aberto (30 dias): a projeção do silo aquecendo cruza a
  // cláusula de umidade máxima (14%) e gera o alerta de desconto.
  await api()
    .post('/api/contracts')
    .set(bearer(coop.token))
    .send({
      sellerId: producer.orgId,
      grainType: 'soja',
      quantitySacks: 1000,
      harvestYear: '2024/2025',
      harvestPeriod: 'unica',
      qualityAdjType: 'proportional',
      priceType: 'fixo',
      priceValueCents: 12000,
      warehouseName: 'Armazém',
      warehouseAddress: { city: 'Cascavel', state: 'PR' },
      deliveryDeadline: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      transportResponsible: 'seller',
    })
    .expect(201);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('Field data (e2e)', () => {
  it('overview traz fazenda, culturas e estimativa de preço', async () => {
    const res = await api()
      .get('/api/field-data/overview')
      .set(bearer(producer.token))
      .expect(200);

    expect(res.body.farm.hectares).toBe(24.2);
    expect(res.body.farm.alqueires).toBe(10);
    expect(res.body.crops).toHaveLength(3);

    const soja = res.body.crops.find((c: { grainType: string }) => c.grainType === 'soja');
    const milho = res.body.crops.find((c: { grainType: string }) => c.grainType === 'milho');

    // Soja seca e disponível → apta à venda. Estimativa = produtividade × área ×
    // cotação do dia (feed simulado é determinístico por dia, não fixo).
    expect(soja.aptToSell).toBe(true);
    expect(soja.availableSacks).toBe(1500);
    expect(soja.pricing.estimatedGrossValueCents).toBe(
      Math.round(62 * 24.2 * soja.pricing.indicativePriceCents),
    );

    // Milho ainda em beneficiamento → não apto
    expect(milho.aptToSell).toBe(false);
  });

  it('satélite: lote em desenvolvimento ganha série NDVI e estimativa pré-colheita', async () => {
    const res = await api()
      .get('/api/field-data/overview')
      .set(bearer(producer.token))
      .expect(200);

    const trigo = res.body.crops.find((c: { grainType: string }) => c.grainType === 'trigo');
    expect(trigo.satellite).not.toBeNull();
    expect(trigo.satellite.ndviSeries.length).toBeGreaterThanOrEqual(2);
    expect(trigo.satellite.estimatedYieldSacksPerHa).toBeGreaterThan(0);
    expect(trigo.satellite.yieldRangeSacksPerHa.min).toBeLessThanOrEqual(
      trigo.satellite.estimatedYieldSacksPerHa,
    );
  });

  it('silo aquecendo × contrato: projeta umidade na entrega e quantifica o desconto', async () => {
    const res = await api()
      .get('/api/field-data/overview')
      .set(bearer(producer.token))
      .expect(200);

    const soja = res.body.crops.find((c: { grainType: string }) => c.grainType === 'soja');
    // Telemetria do silo reconstituída (14 dias) com tendência de aquecimento.
    expect(soja.storage.telemetry.trend.warming).toBe(true);
    expect(soja.storage.telemetry.history).toHaveLength(14);

    // 12,5% + deriva de 30 dias cruza o máximo contratado (14%) → desconto estimado.
    expect(soja.storageRisk).not.toBeNull();
    expect(soja.storageRisk.projectedMoisturePct).toBeGreaterThan(soja.storageRisk.maxMoisturePct);
    expect(soja.storageRisk.discountPct).toBeGreaterThan(0);
    expect(soja.storageRisk.estDiscountCents).toBeGreaterThan(0);

    const alert = res.body.weather.alerts.find((a: { message: string }) =>
      a.message.includes('umidade projetada'),
    );
    expect(alert.level).toBe('urgente');
  });

  it('preço-alvo: PATCH persiste e a cotação sinaliza quando cruza o alvo', async () => {
    // 10.625 = piso determinístico da série simulada de soja (0,85 × referência).
    await api()
      .patch('/api/field-data/target-price')
      .set(bearer(producer.token))
      .send({ grainType: 'soja', targetPriceCents: 10625 })
      .expect(200);

    const res = await api()
      .get('/api/field-data/overview')
      .set(bearer(producer.token))
      .expect(200);

    const quote = res.body.market.quotes.find((q: { grainType: string }) => q.grainType === 'soja');
    expect(quote.targetPriceCents).toBe(10625);
    expect(quote.targetHit).toBe(true);
    expect(
      res.body.weather.alerts.some((a: { message: string }) => a.message.includes('Preço-alvo atingido')),
    ).toBe(true);

    // Remove o alvo → sinal some.
    await api()
      .patch('/api/field-data/target-price')
      .set(bearer(producer.token))
      .send({ grainType: 'soja', targetPriceCents: null })
      .expect(200);
    const after = await api().get('/api/field-data/overview').set(bearer(producer.token)).expect(200);
    const quoteAfter = after.body.market.quotes.find(
      (q: { grainType: string }) => q.grainType === 'soja',
    );
    expect(quoteAfter.targetPriceCents).toBeNull();
  });

  it('cooperativa não define preço-alvo (RBAC 403)', async () => {
    await api()
      .patch('/api/field-data/target-price')
      .set(bearer(coop.token))
      .send({ grainType: 'soja', targetPriceCents: 12000 })
      .expect(403);
  });

  it('IA sugere oferta antecipada (a termo) para a lavoura em desenvolvimento', async () => {
    const res = await api()
      .post('/api/ai/suggest-contracts')
      .set(bearer(producer.token))
      .expect(201);

    const antecipada = res.body.suggestions.find(
      (s: { offerType: string; grainType: string }) => s.offerType === 'antecipada',
    );
    expect(antecipada.grainType).toBe('trigo');
    expect(antecipada.estimated).toBe(true);
    expect(antecipada.quantitySacks).toBeGreaterThan(0);

    const imediata = res.body.suggestions.find(
      (s: { offerType: string; grainType: string }) => s.grainType === 'soja',
    );
    expect(imediata.offerType).toBe('imediata');
  });
});
