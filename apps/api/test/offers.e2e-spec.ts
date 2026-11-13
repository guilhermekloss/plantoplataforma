import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * Fluxo produtor-first: lote disponível → produtor disponibiliza (oferta) →
 * cooperativa vê no mercado → gera contrato a partir da oferta.
 */
const prisma = new PrismaClient();
let app: INestApplication;
const api = () => request(app.getHttpServer());

async function registerOrg(type: 'cooperative' | 'producer', email: string) {
  const res = await api()
    .post('/api/auth/register')
    .send({ name: type, email, password: 'senha12345', type, acceptedTerms: true })
    .expect(201);
  return { token: res.body.accessToken as string, orgId: res.body.user.organizationId as string };
}

let coop: { token: string; orgId: string };
let producer: { token: string; orgId: string };
let readingId: string;
let offerId: string;

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

  coop = await registerOrg('cooperative', 'coop@off.local');
  producer = await registerOrg('producer', 'prod@off.local');

  const reading = await prisma.fieldReading.create({
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
    },
  });
  readingId = reading.id;
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('Offers / mercado (e2e)', () => {
  it('cooperativa não pode disponibilizar lote (RBAC 403)', async () => {
    await api().post('/api/offers').set(bearer(coop.token)).send({ fieldReadingId: readingId }).expect(403);
  });

  it('produtor disponibiliza o lote (oferta criada, lote → ofertado)', async () => {
    const res = await api()
      .post('/api/offers')
      .set(bearer(producer.token))
      .send({ fieldReadingId: readingId, askingPriceCents: 12500 })
      .expect(201);
    expect(res.body.status).toBe('disponivel');
    expect(Number(res.body.quantitySacks)).toBe(1500);
    offerId = res.body.id;

    const reading = await prisma.fieldReading.findUnique({ where: { id: readingId } });
    expect(reading?.status).toBe('ofertado');
  });

  it('lote já ofertado não pode ser ofertado de novo (400)', async () => {
    await api().post('/api/offers').set(bearer(producer.token)).send({ fieldReadingId: readingId }).expect(400);
  });

  it('mercado mostra a oferta para a cooperativa, com telemetria', async () => {
    const res = await api().get('/api/offers/marketplace').set(bearer(coop.token)).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].quantitySacks).toBe(1500);
    expect(res.body[0].telemetry.yieldSacksPerHa).toBe(62);
    // Lote sem dados de sensor anexados → oferta apenas declarada.
    expect(res.body[0].verification.level).toBe('declarado');
  });

  it('produtor não acessa o mercado (RBAC 403)', async () => {
    await api().get('/api/offers/marketplace').set(bearer(producer.token)).expect(403);
  });

  it('cooperativa aceita a oferta → gera contrato (com dados de campo anexados)', async () => {
    const res = await api().post(`/api/offers/${offerId}/accept`).set(bearer(coop.token)).send({}).expect(201);
    const contractId = res.body.contractId;
    expect(contractId).toBeTruthy();

    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    expect(offer?.status).toBe('contratada');
    expect(offer?.contractId).toBe(contractId);

    const reading = await prisma.fieldReading.findUnique({ where: { id: readingId } });
    expect(reading?.status).toBe('vendido');

    const contract = await api().get(`/api/contracts/${contractId}`).set(bearer(coop.token)).expect(200);
    expect(contract.body.grainType).toBe('soja');
    expect(Number(contract.body.quantitySacks)).toBe(1500);
    expect(contract.body.agronomicData).toBeTruthy();
    expect(contract.body.status).toBe('pendente_assinatura_comprador');
  });

  it('oferta já contratada não pode ser aceita de novo (400)', async () => {
    await api().post(`/api/offers/${offerId}/accept`).set(bearer(coop.token)).send({}).expect(400);
  });

  it('minhas ofertas (produtor) mostra a oferta contratada', async () => {
    const res = await api().get('/api/offers/mine').set(bearer(producer.token)).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('contratada');
    expect(res.body[0].contract).toBeTruthy();
  });

  it('lote com telemetria + silo + NDVI vira oferta "verificada por sensores"', async () => {
    const verified = await prisma.fieldReading.create({
      data: {
        organizationId: producer.orgId,
        grainType: 'trigo',
        harvestYear: '2025/2026',
        harvestPeriod: 'unica',
        areaHa: 12,
        yieldSacksPerHa: 53,
        storedMoisturePct: 12.8,
        ndviAvg: 0.66,
        machineData: { harvester: 'Case IH Axial-Flow', fuelLPerHa: 10.4 },
        storage: { siloName: 'Silo 1', grainTempC: 24, ambientTempC: 20 },
        source: 'AFS Connect + INMET',
        status: 'disponivel',
        availableSacks: 636,
      },
    });
    await api()
      .post('/api/offers')
      .set(bearer(producer.token))
      .send({ fieldReadingId: verified.id })
      .expect(201);

    const res = await api().get('/api/offers/marketplace').set(bearer(coop.token)).expect(200);
    const offer = res.body.find((o: { grainType: string }) => o.grainType === 'trigo');
    expect(offer.verification.level).toBe('sensores');
    expect(offer.verification.sources).toContain('termometria de silo');
    expect(offer.verification.sources).toContain('NDVI de satélite');
    expect(offer.verification.sources).toContain('telemetria de máquina');
  });
});
