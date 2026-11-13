import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();
let app: INestApplication;
const api = () => request(app.getHttpServer());
const VALID_NFE = '1'.repeat(44);

async function registerOrg(type: 'cooperative' | 'producer', email: string) {
  const res = await api()
    .post('/api/auth/register')
    .send({ name: type, email, password: 'senha12345', type, acceptedTerms: true })
    .expect(201);
  return { token: res.body.accessToken as string, orgId: res.body.user.organizationId as string };
}

let coop: { token: string; orgId: string };
let producer: { token: string; orgId: string };
let contractId: string;
let deliveryAId: string;

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

  coop = await registerOrg('cooperative', 'coop@del.local');
  producer = await registerOrg('producer', 'prod@del.local');

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
      deliveryDeadline: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      transportResponsible: 'seller',
    })
    .expect(201);
  contractId = create.body.id;
  await api().post(`/api/contracts/${contractId}/submit`).set('Authorization', `Bearer ${coop.token}`).expect(201);
  await api().post(`/api/contracts/${contractId}/sign`).set('Authorization', `Bearer ${coop.token}`).send({ accept: true }).expect(201);
  await api().post(`/api/contracts/${contractId}/sign`).set('Authorization', `Bearer ${producer.token}`).send({ accept: true }).expect(201);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const auth = () => ({ Authorization: `Bearer ${coop.token}` });

describe('Deliveries (e2e)', () => {
  it('registra entrega parcial → contrato entregue_parcial', async () => {
    const res = await api()
      .post('/api/deliveries')
      .set(auth())
      .send({ contractId, deliveryDate: new Date().toISOString(), quantitySacks: 600, nfeKey: VALID_NFE })
      .expect(201);
    deliveryAId = res.body.id;

    const contract = await api().get(`/api/contracts/${contractId}`).set(auth()).expect(200);
    expect(contract.body.status).toBe('entregue_parcial');
  });

  it('rejeita quantidade acima do saldo (400)', async () => {
    await api()
      .post('/api/deliveries')
      .set(auth())
      .send({ contractId, deliveryDate: new Date().toISOString(), quantitySacks: 500 })
      .expect(400);
  });

  it('rejeita NFe com formato inválido (400)', async () => {
    await api()
      .post('/api/deliveries')
      .set(auth())
      .send({ contractId, deliveryDate: new Date().toISOString(), quantitySacks: 100, nfeKey: '123' })
      .expect(400);
  });

  it('produtor não pode registrar entrega (403)', async () => {
    await api()
      .post('/api/deliveries')
      .set({ Authorization: `Bearer ${producer.token}` })
      .send({ contractId, deliveryDate: new Date().toISOString(), quantitySacks: 100 })
      .expect(403);
  });

  it('laudo calcula grade e desconto automaticamente (umidade alta → desconto proporcional)', async () => {
    const res = await api()
      .post(`/api/deliveries/${deliveryAId}/quality-report`)
      .set(auth())
      .send({
        reportNumber: 'LAU-001',
        laboratoryName: 'Lab Central',
        reportDate: new Date().toISOString(),
        moisturePct: 16,
        impurityPct: 0.5,
        damagedPct: 5,
        specificWeightGL: 700,
      })
      .expect(201);
    expect(res.body.grade).toBe('fora_padrao'); // umidade 16 > 14
    expect(res.body.priceAdjustmentPct).toBeCloseTo(1.4); // (16-14)*0.7
  });

  it('libera pagamento aplicando o desconto', async () => {
    const res = await api()
      .post(`/api/deliveries/${deliveryAId}/release-payment`)
      .set(auth())
      .expect(201);
    expect(res.body.paymentStatus).toBe('liberado');
    // 12000 * 600 * (1 - 1.4/100) = 7.099.200
    expect(Number(res.body.paymentAmountCents)).toBe(7099200);
  });

  it('entrega que completa o total → liquidado', async () => {
    await api()
      .post('/api/deliveries')
      .set(auth())
      .send({ contractId, deliveryDate: new Date().toISOString(), quantitySacks: 400, nfeKey: VALID_NFE })
      .expect(201);
    const contract = await api().get(`/api/contracts/${contractId}`).set(auth()).expect(200);
    expect(contract.body.status).toBe('liquidado');
  });

  it('laudo limpo → grade T1 e desconto 0', async () => {
    const list = await api().get(`/api/deliveries?contractId=${contractId}`).set(auth()).expect(200);
    const second = list.body.find((d: { id: string; quantitySacks: string }) => Number(d.quantitySacks) === 400);
    const res = await api()
      .post(`/api/deliveries/${second.id}/quality-report`)
      .set(auth())
      .send({
        reportNumber: 'LAU-002',
        laboratoryName: 'Lab Central',
        reportDate: new Date().toISOString(),
        moisturePct: 13,
        impurityPct: 0.5,
        damagedPct: 4,
        specificWeightGL: 720,
      })
      .expect(201);
    expect(res.body.grade).toBe('T1');
    expect(res.body.priceAdjustmentPct).toBe(0);
  });

  it('não registra entrega após liquidado (400)', async () => {
    await api()
      .post('/api/deliveries')
      .set(auth())
      .send({ contractId, deliveryDate: new Date().toISOString(), quantitySacks: 10 })
      .expect(400);
  });
});
