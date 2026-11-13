import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * Fluxo completo do Módulo 2 — HTTP real + PostgreSQL (Docker).
 * Cobre: criação (só comprador), validações, submit, assinatura das duas partes
 * com hash canônico, eventos por transição, e RLS.
 */
const prisma = new PrismaClient();
let app: INestApplication;

const api = () => request(app.getHttpServer());

async function registerOrg(
  type: 'cooperative' | 'producer',
  email: string,
): Promise<{ token: string; orgId: string }> {
  const res = await api()
    .post('/api/auth/register')
    .send({ name: `${type}-${email}`, email, password: 'senha12345', type, acceptedTerms: true })
    .expect(201);
  return { token: res.body.accessToken, orgId: res.body.user.organizationId };
}

const futureDate = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();

function contractPayload(sellerId: string) {
  return {
    sellerId,
    grainType: 'soja',
    quantitySacks: 1000,
    harvestYear: '2025/2026',
    harvestPeriod: 'unica',
    maxMoisturePct: 14,
    maxImpurityPct: 1,
    minSpecificWeightGL: 660,
    maxDamagedPct: 8,
    qualityAdjType: 'proportional',
    priceType: 'fixo',
    priceValueCents: 12000,
    priceCurrency: 'BRL',
    warehouseName: 'Armazém Central',
    warehouseAddress: { city: 'Não-Me-Toque', state: 'RS' },
    deliveryDeadline: futureDate,
    transportResponsible: 'seller',
  };
}

let coop: { token: string; orgId: string };
let producer: { token: string; orgId: string };
let stranger: { token: string; orgId: string };
let contractId: string;

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

  coop = await registerOrg('cooperative', 'coop@ctr.local');
  producer = await registerOrg('producer', 'prod@ctr.local');
  stranger = await registerOrg('cooperative', 'other@ctr.local');
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('Contracts (e2e)', () => {
  it('cooperativa cria contrato (rascunho, número PLT-AAAA-0001)', async () => {
    const res = await api()
      .post('/api/contracts')
      .set('Authorization', `Bearer ${coop.token}`)
      .send(contractPayload(producer.orgId))
      .expect(201);
    expect(res.body.status).toBe('rascunho');
    expect(res.body.contractNumber).toMatch(/^PLT-\d{4}-0001$/);
    contractId = res.body.id;
  });

  it('produtor NÃO pode criar contrato (RBAC 403)', async () => {
    await api()
      .post('/api/contracts')
      .set('Authorization', `Bearer ${producer.token}`)
      .send(contractPayload(producer.orgId))
      .expect(403);
  });

  it('rejeita seller que não é produtor (400)', async () => {
    await api()
      .post('/api/contracts')
      .set('Authorization', `Bearer ${coop.token}`)
      .send(contractPayload(coop.orgId))
      .expect(400);
  });

  it('rejeita data de entrega no passado (400)', async () => {
    await api()
      .post('/api/contracts')
      .set('Authorization', `Bearer ${coop.token}`)
      .send({ ...contractPayload(producer.orgId), deliveryDeadline: '2020-01-01T00:00:00.000Z' })
      .expect(400);
  });

  it('terceiro (sem relação) não acessa o contrato (RLS 403)', async () => {
    await api()
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(403);
  });

  it('produtor (outro tenant) enxerga o contrato em que é seller', async () => {
    const res = await api()
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${producer.token}`)
      .expect(200);
    expect(res.body.id).toBe(contractId);
  });

  it('submit move para pendente_assinatura_comprador', async () => {
    const res = await api()
      .post(`/api/contracts/${contractId}/submit`)
      .set('Authorization', `Bearer ${coop.token}`)
      .expect(201);
    expect(res.body.status).toBe('pendente_assinatura_comprador');
  });

  it('produtor não pode assinar fora da vez (400)', async () => {
    await api()
      .post(`/api/contracts/${contractId}/sign`)
      .set('Authorization', `Bearer ${producer.token}`)
      .send({ accept: true })
      .expect(400);
  });

  it('comprador assina → pendente_assinatura_produtor', async () => {
    const res = await api()
      .post(`/api/contracts/${contractId}/sign`)
      .set('Authorization', `Bearer ${coop.token}`)
      .send({ accept: true })
      .expect(201);
    expect(res.body.status).toBe('pendente_assinatura_produtor');
    expect(res.body.contractHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produtor assina → contrato em execução, signedAt definido', async () => {
    const res = await api()
      .post(`/api/contracts/${contractId}/sign`)
      .set('Authorization', `Bearer ${producer.token}`)
      .send({ accept: true })
      .expect(201);
    expect(res.body.status).toBe('em_execucao');
    expect(res.body.signedAt).toBeTruthy();
  });

  it('armazena 2 assinaturas com hash antes/depois', async () => {
    const res = await api()
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${coop.token}`)
      .expect(200);
    expect(res.body.signatures).toHaveLength(2);
    for (const sig of res.body.signatures) {
      expect(sig.documentHashBefore).toMatch(/^[0-9a-f]{64}$/);
      expect(sig.documentHashAfter).toMatch(/^[0-9a-f]{64}$/);
      expect(sig.ipAddress).toBeTruthy();
      expect(sig.userAgent).toBeTruthy();
    }
  });

  it('timeline contém os eventos das transições', async () => {
    const res = await api()
      .get(`/api/contracts/${contractId}/events`)
      .set('Authorization', `Bearer ${coop.token}`)
      .expect(200);
    const types = res.body.map((e: { eventType: string }) => e.eventType);
    expect(types).toContain('criado');
    expect(types).toContain('assinado_comprador');
    expect(types).toContain('assinado_produtor');
    expect(types).toContain('em_execucao');
  });

  it('listagem filtra por status', async () => {
    const res = await api()
      .get('/api/contracts?status=em_execucao')
      .set('Authorization', `Bearer ${coop.token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(contractId);
  });
});
