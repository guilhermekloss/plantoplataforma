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
  await prisma.user.create({
    data: { email, name, passwordHash, role, organizationId: org.id },
  });
  const login = await request(app.getHttpServer()).post("/auth/login").send({ email, password: "plantor123" });
  return { org, accessToken: login.body.accessToken as string };
}

describe("Contracts (e2e)", () => {
  it("cria contrato -> aparece pendente de assinatura -> assinado pelas duas partes -> ASSINADO com hash", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

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
    expect(createRes.status).toBe(201);
    expect(createRes.body.number).toMatch(/^PLT-\d{4}-\d{4}$/);
    expect(createRes.body.status).toBe("PENDENTE_ASSINATURA");
    expect(createRes.body.totalValueCents).toBe(13_000_000); // 1000 sc * 13000 centavos

    const contractId = createRes.body.id;

    const afterBuyerSign = await request(app.getHttpServer())
      .post(`/contracts/${contractId}/sign`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(afterBuyerSign.status).toBe(201);
    expect(afterBuyerSign.body.status).toBe("PENDENTE_ASSINATURA");
    expect(afterBuyerSign.body.signedByBuyerAt).not.toBeNull();
    expect(afterBuyerSign.body.signedBySellerAt).toBeNull();

    const afterSellerSign = await request(app.getHttpServer())
      .post(`/contracts/${contractId}/sign`)
      .set("Authorization", `Bearer ${seller.accessToken}`);
    expect(afterSellerSign.status).toBe(201);
    expect(afterSellerSign.body.status).toBe("ASSINADO");
    expect(afterSellerSign.body.contractHash).toEqual(expect.any(String));
    expect(afterSellerSign.body.contractHash).toHaveLength(64);
  });

  it("organização não envolvida no contrato recebe 403 ao tentar acessar ou assinar", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const outsider = await createOrgWithUser("Fazenda Vizinha", "PRODUCER", "vizinho@fazenda.example", "PRODUCER");

    const createRes = await request(app.getHttpServer())
      .post("/contracts")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({
        sellerOrgId: seller.org.id,
        crop: "MILHO",
        quantityKg: 60_000,
        pricePerSc60Cents: 6_500,
        deliveryDeadline: "2026-12-01T00:00:00.000Z",
      });
    const contractId = createRes.body.id;

    const getRes = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(getRes.status).toBe(403);

    const signRes = await request(app.getHttpServer())
      .post(`/contracts/${contractId}/sign`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(signRes.status).toBe(403);
  });

  it("listagem só retorna contratos em que a organização é parte", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const outsider = await createOrgWithUser("Fazenda Vizinha", "PRODUCER", "vizinho@fazenda.example", "PRODUCER");

    await request(app.getHttpServer())
      .post("/contracts")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({
        sellerOrgId: seller.org.id,
        crop: "TRIGO",
        quantityKg: 30_000,
        pricePerSc60Cents: 8_000,
        deliveryDeadline: "2026-12-01T00:00:00.000Z",
      });

    const buyerList = await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(buyerList.body).toHaveLength(1);

    const sellerList = await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", `Bearer ${seller.accessToken}`);
    expect(sellerList.body).toHaveLength(1);

    const outsiderList = await request(app.getHttpServer())
      .get("/contracts")
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(outsiderList.body).toHaveLength(0);
  });

  it("não permite assinar duas vezes pela mesma organização", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

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

    await request(app.getHttpServer())
      .post(`/contracts/${contractId}/sign`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    const secondSign = await request(app.getHttpServer())
      .post(`/contracts/${contractId}/sign`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(secondSign.status).toBe(400);
  });

  it("detalhe do contrato inclui timeline de eventos (CRIADO e ASSINADO)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

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

    await request(app.getHttpServer()).post(`/contracts/${contractId}/sign`).set("Authorization", `Bearer ${buyer.accessToken}`);
    await request(app.getHttpServer()).post(`/contracts/${contractId}/sign`).set("Authorization", `Bearer ${seller.accessToken}`);

    const detail = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    const eventTypes = detail.body.events.map((e: { type: string }) => e.type);
    expect(eventTypes).toContain("CRIADO");
    expect(eventTypes).toContain("ASSINADO");
  });
});
