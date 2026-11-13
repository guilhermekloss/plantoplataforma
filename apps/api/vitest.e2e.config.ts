import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

/**
 * Config dos testes de integração (e2e) que TOCAM o banco real (PostgreSQL).
 * Mantidos separados de `vitest.config.ts` para que `npm test` continue sem DB.
 * Rode com: npm run test:e2e --workspace=@plantor/api
 * O banco vem de `apps/api/.env.test` (nunca o de dev) — ver test/global-setup.ts.
 */
export default defineConfig({
  // SWC emite decorator metadata (emitDecoratorMetadata) que o esbuild do
  // Vitest não gera — necessário para a injeção de dependências do NestJS.
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // O banco é compartilhado: sem paralelismo entre arquivos para evitar corrida.
    fileParallelism: false,
  },
});
