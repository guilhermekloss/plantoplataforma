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

async function createSignedContract(buyerToken: string, sellerToken: string, sellerOrgId: string, quantityKg = 60_000) {
  const createRes = await request(app.getHttpServer())
    .post("/contracts")
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({
      sellerOrgId,
      crop: "SOJA",
      quantityKg,
      pricePerSc60Cents: 13_000,
      deliveryDeadline: "2026-12-01T00:00:00.000Z",
    });
  const contractId = createRes.body.id;
  await request(app.getHttpServer()).post(`/contracts/${contractId}/sign`).set("Authorization", `Bearer ${buyerToken}`);
  await request(app.getHttpServer()).post(`/contracts/${contractId}/sign`).set("Authorization", `Bearer ${sellerToken}`);
  return contractId;
}

describe("Deliveries (e2e)", () => {
  it("vendedor não pode registrar entrega (só o comprador)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const contractId = await createSignedContract(buyer.accessToken, seller.accessToken, seller.org.id);

    const res = await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ contractId, quantityKg: 60_000, deliveredAt: "2026-11-01T00:00:00.000Z" });

    expect(res.status).toBe(403);
  });

  it("entrega parcial muda status pra ENTREGA_PARCIAL, entrega completa muda pra LIQUIDADO", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const contractId = await createSignedContract(buyer.accessToken, seller.accessToken, seller.org.id, 60_000);

    const first = await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ contractId, quantityKg: 30_000, deliveredAt: "2026-11-01T00:00:00.000Z" });
    expect(first.status).toBe(201);

    const afterFirst = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(afterFirst.body.status).toBe("ENTREGA_PARCIAL");

    const second = await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ contractId, quantityKg: 30_000, deliveredAt: "2026-11-15T00:00:00.000Z" });
    expect(second.status).toBe(201);

    const afterSecond = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(afterSecond.body.status).toBe("LIQUIDADO");
  });

  it("não permite registrar entrega em contrato ainda não assinado", async () => {
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

    const res = await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ contractId: createRes.body.id, quantityKg: 10_000, deliveredAt: "2026-11-01T00:00:00.000Z" });

    expect(res.status).toBe(400);
  });

  it("laudo calcula gradeClass e desconto corretamente e não permite laudo duplicado", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const contractId = await createSignedContract(buyer.accessToken, seller.accessToken, seller.org.id, 60_000);

    const delivery = await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ contractId, quantityKg: 60_000, deliveredAt: "2026-11-01T00:00:00.000Z" });
    const deliveryId = delivery.body.id;

    const reportRes = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/quality-report`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ moisturePct: 14.5, impuritiesPct: 2, brokenGrainsPct: 15 });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.gradeClass).toBe("TIPO_2");
    expect(reportRes.body.discountPct).toBeCloseTo(5.25, 5); // (0.5*1.5)+(1*1.0)+(7*0.5)
    expect(reportRes.body.finalValueCents).toBeLessThan(13_000_000);

    const duplicateRes = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/quality-report`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ moisturePct: 13, impuritiesPct: 0.5, brokenGrainsPct: 5 });
    expect(duplicateRes.status).toBe(400);
  });

  it("libera pagamento e impede liberar duas vezes; vendedor não pode liberar", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const contractId = await createSignedContract(buyer.accessToken, seller.accessToken, seller.org.id, 60_000);

    const delivery = await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ contractId, quantityKg: 60_000, deliveredAt: "2026-11-01T00:00:00.000Z" });
    const deliveryId = delivery.body.id;

    const sellerRelease = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/release-payment`)
      .set("Authorization", `Bearer ${seller.accessToken}`);
    expect(sellerRelease.status).toBe(403);

    const release = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/release-payment`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(release.status).toBe(201);
    expect(release.body.paidAt).not.toBeNull();

    const secondRelease = await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/release-payment`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(secondRelease.status).toBe(400);
  });

  it("GET /deliveries?contractId lista entregas do contrato", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const contractId = await createSignedContract(buyer.accessToken, seller.accessToken, seller.org.id, 60_000);

    await request(app.getHttpServer())
      .post("/deliveries")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ contractId, quantityKg: 30_000, deliveredAt: "2026-11-01T00:00:00.000Z" });

    const res = await request(app.getHttpServer())
      .get(`/deliveries?contractId=${contractId}`)
      .set("Authorization", `Bearer ${seller.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
