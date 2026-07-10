import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Idempotente (upsert-based) — roda contra o banco de dev e também contra
 * plantor_test para fixtures de e2e. Cresce módulo a módulo (M2 adiciona
 * contratos, M8/M9 adicionam FieldReading/Lote).
 */
async function main() {
  const passwordHash = await bcrypt.hash("plantor123", 10);

  const cotrijal = await prisma.organization.upsert({
    where: { cnpj: "00000000000191" },
    update: {},
    create: {
      name: "Cotrijal",
      type: "COOPERATIVE",
      cnpj: "00000000000191",
      city: "Não-Me-Toque",
      state: "RS",
    },
  });

  const fazenda = await prisma.organization.upsert({
    where: { cnpj: "11111111000191" },
    update: {},
    create: {
      name: "Fazenda São João",
      type: "PRODUCER",
      cnpj: "11111111000191",
      city: "Cascavel",
      state: "PR",
    },
  });

  await prisma.user.upsert({
    where: { email: "operador@cotrijal.example" },
    update: {},
    create: {
      email: "operador@cotrijal.example",
      name: "Operador Cotrijal",
      passwordHash,
      role: "OPERATOR",
      organizationId: cotrijal.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "joao@fazenda.example" },
    update: {},
    create: {
      email: "joao@fazenda.example",
      name: "João da Fazenda",
      passwordHash,
      role: "PRODUCER",
      organizationId: fazenda.id,
    },
  });

  const year = new Date().getFullYear();
  const contractsData: {
    number: string;
    crop: "SOJA" | "MILHO" | "TRIGO";
    quantityKg: number;
    pricePerSc60Cents: number;
    status: "PENDENTE_ASSINATURA" | "ASSINADO";
  }[] = [
    { number: `PLT-${year}-0001`, crop: "SOJA", quantityKg: 60_000, pricePerSc60Cents: 13_000, status: "ASSINADO" },
    { number: `PLT-${year}-0002`, crop: "MILHO", quantityKg: 90_000, pricePerSc60Cents: 6_500, status: "PENDENTE_ASSINATURA" },
    { number: `PLT-${year}-0003`, crop: "TRIGO", quantityKg: 30_000, pricePerSc60Cents: 8_000, status: "ASSINADO" },
  ];

  for (const c of contractsData) {
    const totalValueCents = Math.round((c.quantityKg / 60) * c.pricePerSc60Cents);
    const signed = c.status === "ASSINADO";
    await prisma.contract.upsert({
      where: { number: c.number },
      update: {},
      create: {
        number: c.number,
        buyerOrgId: cotrijal.id,
        sellerOrgId: fazenda.id,
        crop: c.crop,
        quantityKg: c.quantityKg,
        pricePerSc60Cents: c.pricePerSc60Cents,
        totalValueCents,
        deliveryDeadline: new Date(`${year}-12-01T00:00:00.000Z`),
        status: c.status,
        signedByBuyerAt: signed ? new Date() : null,
        signedBySellerAt: signed ? new Date() : null,
        events: { create: { type: "CRIADO", payload: { number: c.number } } },
      },
    });
  }

  await prisma.contractSequence.upsert({
    where: { year },
    update: { value: contractsData.length },
    create: { year, value: contractsData.length },
  });

  // Fazenda de exemplo: 10 alqueires (24,2 ha), Cascavel/Toledo-PR — uma
  // leitura de campo por cultura, compatível com os contratos semeados.
  const fieldReadingsData: {
    id: string;
    crop: "SOJA" | "MILHO" | "TRIGO";
    season: string;
    yieldScHa: number;
    harvestMoisture: number;
    ndvi: number;
    plantPopulation: number;
    rainfallMm: number;
    gddAccumulated: number;
    avgTempC: number;
    frostEvents: number;
    readingDate: Date;
  }[] = [
    {
      id: "seed-field-reading-soja",
      crop: "SOJA",
      season: `${year - 1}/${String(year).slice(2)}`,
      yieldScHa: 62,
      harvestMoisture: 13.2,
      ndvi: 0.81,
      plantPopulation: 280_000,
      rainfallMm: 640,
      gddAccumulated: 1450,
      avgTempC: 23.5,
      frostEvents: 0,
      readingDate: new Date(`${year}-05-01T00:00:00.000Z`),
    },
    {
      id: "seed-field-reading-milho",
      crop: "MILHO",
      season: `${year - 1}/${String(year).slice(2)}`,
      yieldScHa: 145,
      harvestMoisture: 15.8,
      ndvi: 0.86,
      plantPopulation: 62_000,
      rainfallMm: 580,
      gddAccumulated: 1700,
      avgTempC: 24.1,
      frostEvents: 0,
      readingDate: new Date(`${year}-04-15T00:00:00.000Z`),
    },
    {
      id: "seed-field-reading-trigo",
      crop: "TRIGO",
      season: `${year - 1}/${String(year).slice(2)}`,
      yieldScHa: 48,
      harvestMoisture: 12.5,
      ndvi: 0.74,
      plantPopulation: 3_200_000,
      rainfallMm: 320,
      gddAccumulated: 980,
      avgTempC: 17.8,
      frostEvents: 2,
      readingDate: new Date(`${year}-09-20T00:00:00.000Z`),
    },
  ];

  for (const r of fieldReadingsData) {
    await prisma.fieldReading.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, organizationId: fazenda.id },
    });
  }

  console.log("Seed M8 ok: 3 leituras de campo (soja/milho/trigo) da Fazenda São João");
  console.log("Seed M2 ok: 3 contratos (soja/milho/trigo) entre Cotrijal e Fazenda São João");
  console.log("Seed M1 ok: Cotrijal + Fazenda São João, usuários operador@cotrijal.example / joao@fazenda.example (senha: plantor123)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
