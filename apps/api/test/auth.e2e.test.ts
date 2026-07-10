import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";
import { resetDatabase } from "./utils/reset-db";

const prisma = new PrismaClient();
let app: INestApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

async function seedCotrijalOperator() {
  const org = await prisma.organization.create({
    data: { name: "Cotrijal", type: "COOPERATIVE" },
  });
  const passwordHash = await bcrypt.hash("plantor123", 10);
  const user = await prisma.user.create({
    data: {
      email: "operador@cotrijal.example",
      name: "Operador Cotrijal",
      passwordHash,
      role: "OPERATOR",
      organizationId: org.id,
    },
  });
  return { org, user };
}

describe("Auth (e2e)", () => {
  it("login com credenciais corretas retorna accessToken", async () => {
    await seedCotrijalOperator();

    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "operador@cotrijal.example", password: "plantor123" });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe("operador@cotrijal.example");
    expect(res.body.user.organizationName).toBe("Cotrijal");
  });

  it("login com senha errada retorna 401", async () => {
    await seedCotrijalOperator();

    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "operador@cotrijal.example", password: "senha-errada" });

    expect(res.status).toBe(401);
  });

  it("login com e-mail inexistente retorna 401 (não 404 — não revela se o e-mail existe)", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "ninguem@example.com", password: "qualquer" });

    expect(res.status).toBe(401);
  });

  it("POST /auth/invite sem token retorna 401", async () => {
    const res = await request(app.getHttpServer()).post("/auth/invite").send({ email: "novo@example.com" });
    expect(res.status).toBe(401);
  });

  it("fluxo completo: emitir convite -> aceitar -> logar com a nova conta", async () => {
    const { org } = await seedCotrijalOperator();
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "operador@cotrijal.example", password: "plantor123" });
    const accessToken = login.body.accessToken;

    const inviteRes = await request(app.getHttpServer())
      .post("/auth/invite")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "colega@cotrijal.example" });
    expect(inviteRes.status).toBe(201);

    // Sem RESEND_API_KEY em .env.test, o e-mail é só logado — geramos o
    // token de convite diretamente para simular o link recebido.
    const inviteModule = await import("../src/auth/invite.service");
    const { ConfigService } = await import("@nestjs/config");
    const config = new ConfigService({ INVITE_JWT_SECRET: process.env.INVITE_JWT_SECRET });
    const inviteService = new inviteModule.InviteService(config);
    const token = inviteService.issue({ email: "colega@cotrijal.example", inviterOrgId: org.id, inviterName: "Operador Cotrijal" });

    const acceptRes = await request(app.getHttpServer()).post("/auth/invite/accept").send({
      token,
      name: "Colega Novo",
      password: "senhaSegura123",
    });
    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.user.organizationName).toBe("Cotrijal");
    expect(acceptRes.body.user.role).toBe("OPERATOR");

    const newLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "colega@cotrijal.example", password: "senhaSegura123" });
    expect(newLogin.status).toBe(201);
  });

  it("convite com newOrganization tipo PRODUCER cria org nova e usuário com role PRODUCER", async () => {
    const inviteModule = await import("../src/auth/invite.service");
    const { ConfigService } = await import("@nestjs/config");
    const config = new ConfigService({ INVITE_JWT_SECRET: process.env.INVITE_JWT_SECRET });
    const inviteService = new inviteModule.InviteService(config);
    const token = inviteService.issue({
      email: "joao@fazenda.example",
      inviterOrgId: "irrelevante-quando-newOrganization",
      inviterName: "Cotrijal",
    });

    const acceptRes = await request(app.getHttpServer())
      .post("/auth/invite/accept")
      .send({
        token,
        name: "João da Fazenda",
        password: "senhaSegura123",
        newOrganization: { name: "Fazenda São João", type: "PRODUCER" },
      });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.user.role).toBe("PRODUCER");
    expect(acceptRes.body.user.organizationType).toBe("PRODUCER");
  });
});
