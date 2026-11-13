import { z } from 'zod';

/**
 * Validação de variáveis de ambiente do app web (Next.js), com Zod.
 * Importado em next.config.mjs para falhar cedo no build/startup.
 *
 * Variáveis NEXT_PUBLIC_* são expostas ao browser — nunca coloque segredos aí.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // NextAuth.js v5 (Auth.js). Aceita AUTH_SECRET ou NEXTAUTH_SECRET.
  AUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

const clientSchema = z.object({
  // URL base da API NestJS (ex: http://localhost:3001/api)
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001/api'),
});

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
};

const merged = serverSchema.merge(clientSchema);
const parsed = merged.safeParse(processEnv);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Variáveis de ambiente do web inválidas:\n${issues}`);
}

export const env = parsed.data;
