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

async function createLote(accessToken: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app.getHttpServer())
    .post("/lotes")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ crop: "SOJA", season: "2025/26", areaHectares: 24.2, quantityKg: 60_000, ...overrides });
  return res.body;
}

async function moveLoteToDisponivel(accessToken: string, loteId: string) {
  await request(app.getHttpServer())
    .patch(`/lotes/${loteId}/status`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ status: "COLHIDO" });
  await request(app.getHttpServer())
    .patch(`/lotes/${loteId}/status`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ status: "DISPONIVEL" });
}

describe("Lotes (e2e)", () => {
  it("cooperativa não pode criar lote (só PRODUCER)", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const res = await request(app.getHttpServer())
      .post("/lotes")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ crop: "SOJA", season: "2025/26", areaHectares: 24.2, quantityKg: 60_000 });
    expect(res.status).toBe(403);
  });

  it("transições válidas funcionam; pular etapa é rejeitado", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken);
    expect(lote.status).toBe("PLANTADO");

    const skipRes = await request(app.getHttpServer())
      .patch(`/lotes/${lote.id}/status`)
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ status: "DISPONIVEL" });
    expect(skipRes.status).toBe(400);

    const colhidoRes = await request(app.getHttpServer())
      .patch(`/lotes/${lote.id}/status`)
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ status: "COLHIDO" });
    expect(colhidoRes.status).toBe(200);
    expect(colhidoRes.body.status).toBe("COLHIDO");

    const disponivelRes = await request(app.getHttpServer())
      .patch(`/lotes/${lote.id}/status`)
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ status: "DISPONIVEL" });
    expect(disponivelRes.status).toBe(200);
    expect(disponivelRes.body.status).toBe("DISPONIVEL");
  });

  it("produtor não pode setar OFERTADO/VENDIDO diretamente (só via fluxo de oferta)", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken);
    await moveLoteToDisponivel(seller.accessToken, lote.id);

    const res = await request(app.getHttpServer())
      .patch(`/lotes/${lote.id}/status`)
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ status: "OFERTADO" });
    expect(res.status).toBe(400);
  });

  it("produtor não pode alterar lote de outra organização (RLS cega faz parecer 404, não 403 — não revela existência)", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const outsider = await createOrgWithUser("Fazenda Vizinha", "PRODUCER", "vizinho@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken);

    const res = await request(app.getHttpServer())
      .patch(`/lotes/${lote.id}/status`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ status: "COLHIDO" });
    expect(res.status).toBe(404);
  });
});

describe("Offers + geração de contrato (e2e)", () => {
  it("cria oferta a partir de lote DISPONIVEL e o lote vira OFERTADO", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken);
    await moveLoteToDisponivel(seller.accessToken, lote.id);

    const offerRes = await request(app.getHttpServer())
      .post("/offers")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ loteId: lote.id, expectedPriceCents: 13_000 });
    expect(offerRes.status).toBe(201);
    expect(offerRes.body.status).toBe("ABERTA");
    expect(offerRes.body.quantityKg).toBe(60_000);

    const loteAfter = await prisma.lote.findUniqueOrThrow({ where: { id: lote.id } });
    expect(loteAfter.status).toBe("OFERTADO");
  });

  it("não permite ofertar lote que não está DISPONIVEL", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken); // ainda PLANTADO

    const res = await request(app.getHttpServer())
      .post("/offers")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ loteId: lote.id });
    expect(res.status).toBe(400);
  });

  it("produtor não vê o mercado (só cooperativa/trading)", async () => {
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const res = await request(app.getHttpServer()).get("/offers/market").set("Authorization", `Bearer ${seller.accessToken}`);
    expect(res.status).toBe(403);
  });

  it("mercado da cooperativa mostra ofertas de QUALQUER produtor", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken);
    await moveLoteToDisponivel(seller.accessToken, lote.id);
    await request(app.getHttpServer())
      .post("/offers")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ loteId: lote.id });

    const marketRes = await request(app.getHttpServer()).get("/offers/market").set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(marketRes.status).toBe(200);
    expect(marketRes.body).toHaveLength(1);
    expect(marketRes.body[0].organization.name).toBe("Fazenda São João");
  });

  it("cooperativa gera contrato em 1 clique: preço/quantidade/agronomicData copiados; oferta CONVERTIDA; lote VENDIDO", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");

    await prisma.fieldReading.create({
      data: {
        organizationId: seller.org.id,
        crop: "SOJA",
        season: "2025/26",
        yieldScHa: 62,
        readingDate: new Date("2026-05-01T00:00:00.000Z"),
      },
    });

    const lote = await createLote(seller.accessToken, { quantityKg: 30_000 });
    await moveLoteToDisponivel(seller.accessToken, lote.id);
    const offerRes = await request(app.getHttpServer())
      .post("/offers")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ loteId: lote.id, expectedPriceCents: 13_000 });
    const offerId = offerRes.body.id;

    const genRes = await request(app.getHttpServer())
      .post(`/offers/${offerId}/generate-contract`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ pricePerSc60Cents: 13_500, deliveryDeadline: "2026-12-01T00:00:00.000Z" });

    expect(genRes.status).toBe(201);
    expect(genRes.body.sellerOrgId).toBe(seller.org.id);
    expect(genRes.body.buyerOrgId).toBe(buyer.org.id);
    expect(genRes.body.crop).toBe("SOJA");
    expect(genRes.body.quantityKg).toBe(30_000);
    expect(genRes.body.pricePerSc60Cents).toBe(13_500);
    expect(genRes.body.agronomicData).toMatchObject({ yieldScHa: 62, season: "2025/26" });

    const offerAfter = await prisma.offer.findUniqueOrThrow({ where: { id: offerId } });
    expect(offerAfter.status).toBe("CONVERTIDA");
    expect(offerAfter.contractId).toBe(genRes.body.id);

    const loteAfter = await prisma.lote.findUniqueOrThrow({ where: { id: lote.id } });
    expect(loteAfter.status).toBe("VENDIDO");
  });

  it("não permite gerar contrato duas vezes da mesma oferta", async () => {
    const buyer = await createOrgWithUser("Cotrijal", "COOPERATIVE", "operador@cotrijal.example", "OPERATOR");
    const seller = await createOrgWithUser("Fazenda São João", "PRODUCER", "joao@fazenda.example", "PRODUCER");
    const lote = await createLote(seller.accessToken);
    await moveLoteToDisponivel(seller.accessToken, lote.id);
    const offerRes = await request(app.getHttpServer())
      .post("/offers")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ loteId: lote.id });

    const body = { pricePerSc60Cents: 13_000, deliveryDeadline: "2026-12-01T00:00:00.000Z" };
    const first = await request(app.getHttpServer())
      .post(`/offers/${offerRes.body.id}/generate-contract`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send(body);
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post(`/offers/${offerRes.body.id}/generate-contract`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send(body);
    expect(second.status).toBe(400);
  });
});
