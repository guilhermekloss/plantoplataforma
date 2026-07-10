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

describe("Field data (e2e)", () => {
  it("GET /field-data/overview retorna só as leituras da própria organização, com estimativa de receita/ha", async () => {
    const producer = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const outsider = await createOrgWithUser("Fazenda Vizinha", "PRODUCER", "vizinho@fazenda.example", "PRODUCER");

    await prisma.fieldReading.create({
      data: {
        organizationId: producer.org.id,
        crop: "SOJA",
        season: "2025/26",
        yieldScHa: 60,
        harvestMoisture: 13.5,
        readingDate: new Date("2026-05-01T00:00:00.000Z"),
      },
    });

    const res = await request(app.getHttpServer())
      .get("/field-data/overview")
      .set("Authorization", `Bearer ${producer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.readings).toHaveLength(1);
    expect(res.body.readings[0].crop).toBe("SOJA");
    expect(res.body.readings[0].estimatedRevenuePerHectareCents).toBe(60 * 13_000);

    const outsiderRes = await request(app.getHttpServer())
      .get("/field-data/overview")
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(outsiderRes.body.readings).toHaveLength(0);
  });

  it("contrato criado anexa snapshot da última leitura de campo compatível (mesma cultura)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

    await prisma.fieldReading.create({
      data: {
        organizationId: seller.org.id,
        crop: "MILHO",
        season: "2024/25",
        yieldScHa: 100,
        readingDate: new Date("2025-05-01T00:00:00.000Z"),
      },
    });
    const latestSoja = await prisma.fieldReading.create({
      data: {
        organizationId: seller.org.id,
        crop: "SOJA",
        season: "2025/26",
        yieldScHa: 62,
        harvestMoisture: 13,
        readingDate: new Date("2026-05-01T00:00:00.000Z"),
      },
    });

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
    expect(createRes.body.agronomicData).toMatchObject({
      fieldReadingId: latestSoja.id,
      yieldScHa: 62,
      season: "2025/26",
    });
  });

  it("contrato sem leitura de campo compatível fica com agronomicData nulo (não quebra)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

    const createRes = await request(app.getHttpServer())
      .post("/contracts")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({
        sellerOrgId: seller.org.id,
        crop: "TRIGO",
        quantityKg: 30_000,
        pricePerSc60Cents: 8_000,
        deliveryDeadline: "2026-12-01T00:00:00.000Z",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.agronomicData).toBeNull();
  });
});
