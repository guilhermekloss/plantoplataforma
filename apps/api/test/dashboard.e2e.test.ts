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

async function createOrgWithUser(name: string, type: "COOPERATIVE" | "PRODUCER", email: string, role: "OPERATOR" | "PRODUCER") {
  const org = await prisma.organization.create({ data: { name, type } });
  const passwordHash = await bcrypt.hash("plantor123", 10);
  await prisma.user.create({ data: { email, name, passwordHash, role, organizationId: org.id } });
  const login = await request(app.getHttpServer()).post("/auth/login").send({ email, password: "plantor123" });
  return { org, accessToken: login.body.accessToken as string };
}

async function createContract(accessToken: string, sellerOrgId: string, overrides: Partial<Record<string, unknown>> = {}) {
  const res = await request(app.getHttpServer())
    .post("/contracts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      sellerOrgId,
      crop: "SOJA",
      quantityKg: 60_000,
      pricePerSc60Cents: 13_000,
      deliveryDeadline: "2026-12-01T00:00:00.000Z",
      ...overrides,
    });
  return res.body;
}

describe("Dashboard (e2e)", () => {
  it("resumo do comprador reflete os contratos em que ele é parte", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

    await createContract(buyer.accessToken, seller.org.id);
    const second = await createContract(buyer.accessToken, seller.org.id, { crop: "MILHO", pricePerSc60Cents: 6_500 });
    await request(app.getHttpServer()).post(`/contracts/${second.id}/sign`).set("Authorization", `Bearer ${buyer.accessToken}`);
    await request(app.getHttpServer()).post(`/contracts/${second.id}/sign`).set("Authorization", `Bearer ${seller.accessToken}`);

    const res = await request(app.getHttpServer())
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalContracts).toBe(2);
    expect(res.body.byStatus.PENDENTE_ASSINATURA).toBe(1);
    expect(res.body.byStatus.ASSINADO).toBe(1);
    expect(res.body.recentContracts).toHaveLength(2);
    expect(res.body.recentContracts[0].counterpartyName).toBe("Fazenda São João");
  });

  it("resumo do vendedor mostra a mesma contagem, com a contraparte invertida", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    await createContract(buyer.accessToken, seller.org.id);

    const res = await request(app.getHttpServer())
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${seller.accessToken}`);

    expect(res.body.totalContracts).toBe(1);
    expect(res.body.recentContracts[0].counterpartyName).toBe("Cotrijal");
  });

  it("organização sem contratos recebe resumo zerado", async () => {
    const outsider = await createOrgWithUser("Fazenda Vizinha", "PRODUCER", "vizinho@fazenda.example", "PRODUCER");

    const res = await request(app.getHttpServer())
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(res.body.totalContracts).toBe(0);
    expect(res.body.totalValueCents).toBe(0);
    expect(res.body.recentContracts).toHaveLength(0);
    expect(res.body.upcomingDeadlines).toHaveLength(0);
  });

  it("contratos com prazo de entrega próximo (<=30 dias) aparecem em upcomingDeadlines", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const far = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString();
    await createContract(buyer.accessToken, seller.org.id, { deliveryDeadline: soon });
    await createContract(buyer.accessToken, seller.org.id, { deliveryDeadline: far, crop: "TRIGO", pricePerSc60Cents: 8_000 });

    const res = await request(app.getHttpServer())
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    expect(res.body.upcomingDeadlines).toHaveLength(1);
  });
});
