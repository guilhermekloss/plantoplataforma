import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/token.service';

/**
 * Teste de integração do fluxo de autenticação (Módulo 1) — HTTP real contra a
 * app Nest + PostgreSQL (Docker). Cobre os critérios de aceite:
 *  - cooperativa cria conta e faz login;
 *  - cooperativa convida produtor e o produtor cria conta pelo link;
 *  - rota protegida sem token retorna 401;
 *  - RBAC: produtor não pode convidar.
 */
const prisma = new PrismaClient();
let app: INestApplication;
let tokenService: TokenService;

async function reset(): Promise<void> {
  await prisma.offer.deleteMany();
  await prisma.fieldReading.deleteMany();
  await prisma.qualityReport.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contractEvent.deleteMany();
  await prisma.contractSignature.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  tokenService = app.get(TokenService);
  await app.init();
  await reset();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const api = () => request(app.getHttpServer());

describe('Auth (e2e)', () => {
  let coopAccessToken: string;
  let coopRefreshToken: string;

  it('registra uma cooperativa', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({
        name: 'Cooperativa Teste',
        email: 'coop@teste.local',
        password: 'senha12345',
        type: 'cooperative',
        acceptedTerms: true,
      })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.organizationType).toBe('cooperative');
    coopAccessToken = res.body.accessToken;
    coopRefreshToken = res.body.refreshToken;
  });

  it('rejeita registro duplicado (409)', async () => {
    await api()
      .post('/api/auth/register')
      .send({
        name: 'Outra',
        email: 'coop@teste.local',
        password: 'senha12345',
        type: 'cooperative',
        acceptedTerms: true,
      })
      .expect(409);
  });

  it('faz login da cooperativa', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'coop@teste.local', password: 'senha12345' })
      .expect(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rejeita login com senha errada (401)', async () => {
    await api()
      .post('/api/auth/login')
      .send({ email: 'coop@teste.local', password: 'errada' })
      .expect(401);
  });

  it('renova o token via refresh', async () => {
    const res = await api()
      .post('/api/auth/refresh')
      .send({ refreshToken: coopRefreshToken })
      .expect(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rota protegida sem token retorna 401', async () => {
    await api().post('/api/auth/invite').send({ email: 'x@y.local' }).expect(401);
  });

  it('cooperativa convida um produtor (200)', async () => {
    const res = await api()
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${coopAccessToken}`)
      .send({ email: 'produtor@teste.local', producerName: 'João' })
      .expect(200);
    expect(res.body.sent).toBe(true);
  });

  it('produtor aceita o convite e ganha acesso', async () => {
    // O email não é enviado em teste (sem RESEND_API_KEY); geramos o token aqui.
    const org = await prisma.organization.findFirstOrThrow({ where: { type: 'cooperative' } });
    const token = await tokenService.signInviteToken({
      email: 'produtor@teste.local',
      inviterOrgId: org.id,
      inviterName: 'coop@teste.local',
    });

    const res = await api()
      .post(`/api/auth/accept-invite/${token}`)
      .send({ name: 'João Produtor', password: 'senha12345', acceptedTerms: true })
      .expect(201);

    expect(res.body.user.role).toBe('producer');
    expect(res.body.user.organizationType).toBe('producer');
  });

  it('produtor NÃO pode convidar (RBAC 403)', async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'produtor@teste.local', password: 'senha12345' })
      .expect(200);

    await api()
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ email: 'outro@teste.local' })
      .expect(403);
  });

  it('convite expirado retorna mensagem clara (401)', async () => {
    const expired = await tokenService['jwt'].signAsync(
      { email: 'z@z.local', inviterOrgId: 'x', inviterName: 'y', role: 'producer', type: 'invite' },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '-1s' },
    );
    const res = await api()
      .post(`/api/auth/accept-invite/${expired}`)
      .send({ name: 'Tarde', password: 'senha12345', acceptedTerms: true })
      .expect(401);
    expect(res.body.message).toContain('expirou');
  });
});
