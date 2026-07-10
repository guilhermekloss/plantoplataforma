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

describe("AI (e2e)", () => {
  it("explicar contrato: só partes do contrato têm acesso (403 pra org de fora)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const outsider = await createOrgWithUser("Fazenda Vizinha", "PRODUCER", "vizinho@fazenda.example", "PRODUCER");

    const createRes = await request(app.getHttpServer())
      .post("/contracts")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({
        sellerOrgId: seller.org.id,
        crop: "SOJA",
        quantityKg: 60_000,
        pricePerSc60Cents: 13_000,
        deliveryDeadline: "2026-12-01T00:00:00.000Z",
      });
    const contractId = createRes.body.id;

    const outsiderRes = await request(app.getHttpServer())
      .post(`/ai/contracts/${contractId}/explain`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(outsiderRes.status).toBe(403);

    const sellerRes = await request(app.getHttpServer())
      .post(`/ai/contracts/${contractId}/explain`)
      .set("Authorization", `Bearer ${seller.accessToken}`);
    expect(sellerRes.status).toBe(201);
    expect(sellerRes.body.source).toBe("fallback"); // sem GEMINI_API_KEY em .env.test
    expect(sellerRes.body.explanation).toContain(createRes.body.number);
  });

  it("assistente: só role PRODUCER tem acesso (403 pra operador da cooperativa)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");

    const res = await request(app.getHttpServer())
      .post("/ai/assistant")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ message: "quanto vou receber?" });

    expect(res.status).toBe(403);
  });

  it("assistente: produtor recebe resposta desativada sem GEMINI_API_KEY", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

    const res = await request(app.getHttpServer())
      .post("/ai/assistant")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ message: "quanto vou receber?" });

    expect(res.status).toBe(201);
    expect(res.body.disabled).toBe(true);
  });
});
