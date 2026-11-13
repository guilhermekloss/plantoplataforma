import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();
let app: INestApplication;
const api = () => request(app.getHttpServer());

async function registerOrg(type: 'cooperative' | 'producer', email: string) {
  const res = await api()
    .post('/api/auth/register')
    .send({ name: `${type}`, email, password: 'senha12345', type, acceptedTerms: true })
    .expect(201);
  return { token: res.body.accessToken as string, orgId: res.body.user.organizationId as string };
}

let coop: { token: string; orgId: string };
let producer: { token: string; orgId: string };

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

  coop = await registerOrg('cooperative', 'coop@dash.local');
  producer = await registerOrg('producer', 'prod@dash.local');

  const create = await api()
    .post('/api/contracts')
    .set('Authorization', `Bearer ${coop.token}`)
    .send({
      sellerId: producer.orgId,
      grainType: 'soja',
      quantitySacks: 1000,
      harvestYear: '2025/2026',
      harvestPeriod: 'unica',
      qualityAdjType: 'proportional',
      priceType: 'fixo',
      priceValueCents: 12000,
      warehouseName: 'Armazém',
      warehouseAddress: { city: 'Não-Me-Toque', state: 'RS' },
      deliveryDeadline: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      transportResponsible: 'seller',
    })
    .expect(201);
  const id = create.body.id;
  await api().post(`/api/contracts/${id}/submit`).set('Authorization', `Bearer ${coop.token}`).expect(201);
  await api().post(`/api/contracts/${id}/sign`).set('Authorization', `Bearer ${coop.token}`).send({ accept: true }).expect(201);
  await api().post(`/api/contracts/${id}/sign`).set('Authorization', `Bearer ${producer.token}`).send({ accept: true }).expect(201);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('Dashboard (e2e)', () => {
  it('cooperativa: KPIs e distribuição refletem o contrato em execução', async () => {
    const res = await api()
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${coop.token}`)
      .expect(200);
    expect(res.body.orgType).toBe('buyer');
    expect(res.body.kpis.activeContracts).toBe(1);
    expect(res.body.kpis.committedSacksMonth).toBe(1000);
    expect(Number(res.body.kpis.openValueCents)).toBe(12000 * 1000);
    expect(res.body.kpis.deliveriesDue30).toBe(1);
    expect(res.body.statusDistribution).toContainEqual({ status: 'em_execucao', count: 1 });
    expect(res.body.recentContracts).toHaveLength(1);
  });

  it('produtor: orgType producer e métricas próprias', async () => {
    const res = await api()
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${producer.token}`)
      .expect(200);
    expect(res.body.orgType).toBe('producer');
    expect(res.body.producer.pendingDeliveries).toBe(1);
    expect(res.body.recentContracts[0].counterpartyName).toBeTruthy();
  });
});
