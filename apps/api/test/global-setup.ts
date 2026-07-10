import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Roda ANTES de qualquer teste e2e. Footgun conhecido: uma versão anterior
 * deste projeto apontava os testes e2e pro MESMO Postgres do dev e rodava
 * TRUNCATE/deleteMany, apagando o seed local sem querer. Por isso: carrega
 * .env.test e aborta imediatamente se DATABASE_URL não apontar para um
 * banco de teste — antes de qualquer teste ter chance de truncar algo.
 */
export default function globalSetup() {
  config({ path: resolve(__dirname, "../.env.test") });

  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) {
    throw new Error(
      `Guarda de segurança: DATABASE_URL não parece ser um banco de teste ("${url}"). ` +
        `Os testes e2e fazem TRUNCATE/deleteMany — nunca aponte para o banco de dev. ` +
        `Configure DATABASE_URL em apps/api/.env.test com um nome que contenha "test".`,
    );
  }
}
