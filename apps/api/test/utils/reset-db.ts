import type { PrismaClient } from "@prisma/client";

/**
 * Só deve ser chamado com o DATABASE_URL do banco de teste — a guarda em
 * test/global-setup.ts já valida isso antes de qualquer teste rodar.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "QualityReport", "Delivery", "ContractEvent", "Offer", "Lote",
      "FieldReading", "Contract", "ContractSequence", "User", "Organization"
    RESTART IDENTITY CASCADE;
  `);
}
