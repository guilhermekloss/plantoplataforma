import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * Webhook de colheita (telemetria de máquina): o evento da OEM cria o lote
 * sozinho no funil de Produção — idempotente por externalId.
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

const harvestEvent = {
  externalId: 'jd-evt-0001',
  machine: 'Colheitadeira John Deere S790',
  grainType: 'soja',
  harvestYear: '2026/2027',
  harvestPeriod: 'unica',
  areaHa: 24.2,
  yieldSacksPerHa: 63,
  harvestMoisturePct: 13.4,
  fuelLPerHa: 11.8,
  finishedAt: new Date().toISOString(),
};

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

  producer = await registerOrg('producer', 'prod@evt.local');
  coop = await registerOrg('cooperative', 'coop@evt.local');
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('Harvest events (e2e)', () => {
  it('evento de colheita cria o lote automaticamente (status colhido)', async () => {
    const res = await api()
      .post('/api/field-data/events/harvest')
      .set(bearer(producer.token))
      .send(harvestEvent)
      .expect(201);

    expect(res.body.created).toBe(true);

    const reading = await prisma.fieldReading.findUnique({
      where: { id: res.body.fieldReadingId },
    });
    expect(reading?.status).toBe('colhido');
    expect(Number(reading?.yieldSacksPerHa)).toBe(63);
    expect((reading?.machineData as { externalId: string }).externalId).toBe('jd-evt-0001');
    expect(reading?.source).toContain('John Deere');
  });

  it('mesmo externalId não duplica o lote (idempotência do webhook)', async () => {
    const res = await api()
      .post('/api/field-data/events/harvest')
      .set(bearer(producer.token))
      .send(harvestEvent)
      .expect(201);

    expect(res.body.created).toBe(false);
    const count = await prisma.fieldReading.count({ where: { organizationId: producer.orgId } });
    expect(count).toBe(1);
  });

  it('lote criado pelo evento aparece no overview do produtor', async () => {
    const res = await api()
      .get('/api/field-data/overview')
      .set(bearer(producer.token))
      .expect(200);

    const lot = res.body.crops.find((c: { grainType: string }) => c.grainType === 'soja');
    expect(lot.status).toBe('colhido');
    expect(lot.harvestMoisturePct).toBe(13.4);
  });

  it('cooperativa não envia evento de colheita (RBAC 403)', async () => {
    await api()
      .post('/api/field-data/events/harvest')
      .set(bearer(coop.token))
      .send({ ...harvestEvent, externalId: 'jd-evt-0002' })
      .expect(403);
  });

  it('payload inválido é rejeitado (400)', async () => {
    await api()
      .post('/api/field-data/events/harvest')
      .set(bearer(producer.token))
      .send({ ...harvestEvent, externalId: 'jd-evt-0003', harvestYear: '2026' })
      .expect(400);
  });

  it('"Simular colheita" (dev) gera e ingere o evento da OEM', async () => {
    const res = await api()
      .post('/api/field-data/events/harvest/simulate?grain=milho')
      .set(bearer(producer.token))
      .expect(201);

    expect(res.body.created).toBe(true);
    expect(res.body.event.grainType).toBe('milho');
    const reading = await prisma.fieldReading.findUnique({ where: { id: res.body.fieldReadingId } });
    expect(reading?.status).toBe('colhido');
  });
});
