import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * Roda ANTES de qualquer teste e2e.
 *
 * As suítes fazem deleteMany/TRUNCATE no banco. Antes elas rodavam contra o
 * MESMO Postgres do dev e apagavam o seed da demo. Agora:
 *  1. carrega `apps/api/.env.test` (sobrescrevendo o que vier do `.env` de dev);
 *  2. aborta se DATABASE_URL não apontar para um banco de teste;
 *  3. aplica as migrações nesse banco (o `migrate deploy` cria o banco se faltar).
 *
 * As variáveis definidas aqui são herdadas pelos workers do Vitest, e o
 * ConfigModule do Nest não sobrescreve variáveis já presentes no ambiente.
 */
export default function globalSetup(): void {
  const apiRoot = resolve(__dirname, '..');
  const envTest = resolve(apiRoot, '.env.test');
  if (!existsSync(envTest)) {
    throw new Error(
      'Faltou apps/api/.env.test — copie o bloco ".env.test" do .env.example. ' +
        'Os testes e2e apagam dados e nunca devem usar o banco de dev.',
    );
  }
  config({ path: envTest, override: true });

  const url = process.env.DATABASE_URL ?? '';
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(
      `Guarda de segurança: DATABASE_URL não aponta para um banco de teste (${new URL(url).pathname}). ` +
        'Os testes e2e fazem deleteMany/TRUNCATE — use um banco cujo nome contenha "test".',
    );
  }
  process.env.DIRECT_URL = process.env.DIRECT_URL ?? url;

  execSync('npx prisma migrate deploy', { cwd: apiRoot, stdio: 'inherit', env: process.env });
}
