import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { NotificationsService } from '../src/notifications/notifications.service';

const prisma = new PrismaClient();
let app: INestApplication;
let notifications: NotificationsService;
const api = () => request(app.getHttpServer());
const DAY = 24 * 3600 * 1000;

async function registerOrg(type: 'cooperative' | 'producer', email: string) {
  const res = await api()
    .post('/api/auth/register')
    .send({ name: type, email, password: 'senha12345', type, acceptedTerms: true })
    .expect(201);
  return { token: res.body.accessToken as string, orgId: res.body.user.organizationId as string };
}

let coop: { token: string; orgId: string };
let producer: { token: string; orgId: string };

async function createContract(deadline: Date): Promise<string> {
  const res = await api()
    .post('/api/contracts')
    .set('Authorization', `Bearer ${coop.token}`)
    .send({
      sellerId: producer.orgId,
      grainType: 'soja',
      quantitySacks: 1000,
      harvestYear: '2025/2026',
      harvestPeriod: 'unica',
      qualityAdjType: 'none',
      priceType: 'fixo',
      priceValueCents: 12000,
      warehouseName: 'Armazém',
      warehouseAddress: { city: 'Não-Me-Toque', state: 'RS' },
      deliveryDeadline: deadline.toISOString(),
      transportResponsible: 'seller',
    })
    .expect(201);
  return res.body.id as string;
}

async function activate(id: string): Promise<void> {
  await api().post(`/api/contracts/${id}/submit`).set('Authorization', `Bearer ${coop.token}`).expect(201);
  await api().post(`/api/contracts/${id}/sign`).set('Authorization', `Bearer ${coop.token}`).send({ accept: true }).expect(201);
  await api().post(`/api/contracts/${id}/sign`).set('Authorization', `Bearer ${producer.token}`).send({ accept: true }).expect(201);
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  notifications = app.get(NotificationsService);

  await prisma.offer.deleteMany();
  await prisma.fieldReading.deleteMany();
  await prisma.qualityReport.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contractEvent.deleteMany();
  await prisma.contractSignature.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  coop = await registerOrg('cooperative', 'coop@notif.local');
  producer = await registerOrg('producer', 'prod@notif.local');

  // A: ativo, vence em ~29,5 dias (dentro da janela) → deve notificar.
  const a = await createContract(new Date(Date.now() + 29.5 * DAY));
  await activate(a);
  // B: ativo, vence em 60 dias (fora da janela) → não notifica.
  const b = await createContract(new Date(Date.now() + 60 * DAY));
  await activate(b);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('Notifications — aviso de prazo (30 dias)', () => {
  it('notifica apenas contratos ativos na janela (29, 30] dias', async () => {
    expect(await notifications.notifyUpcomingDeadlines()).toBe(1);
  });

  it('ignora rascunho dentro da janela', async () => {
    await createContract(new Date(Date.now() + 29.5 * DAY)); // fica em rascunho
    expect(await notifications.notifyUpcomingDeadlines()).toBe(1);
  });
});
