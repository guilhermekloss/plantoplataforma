import { Env, envSchema } from './env.schema';

/**
 * Função de validação usada pelo @nestjs/config no startup.
 * Lança um erro legível (sem vazar valores) se alguma variável estiver inválida.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return parsed.data;
}
