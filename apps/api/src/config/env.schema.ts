import { z } from 'zod';

/**
 * Schema de validação das variáveis de ambiente da API (validado no startup).
 * Nunca leia process.env diretamente fora daqui — use o ConfigService tipado.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Banco (Supabase / Postgres). DATABASE_URL = pooled; DIRECT_URL = migrações.
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // JWT — access 15min / refresh 7d (ver Stack no PROMPT_MVP.md)
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter ao menos 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter ao menos 32 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Convite de produtor (magic link) — TTL 24h
  INVITE_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),

  // Email transacional (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Plantor <no-reply@plantor.com.br>'),

  // URL pública do app web (usada em links de email)
  APP_WEB_URL: z.string().url().default('http://localhost:3000'),

  // CORS: lista explícita de origens separadas por vírgula (nunca "*")
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate limiting (NestJS Throttler) — 100 req/min por IP
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // Observabilidade (opcional no MVP)
  SENTRY_DSN: z.string().optional(),

  // IA (Google Gemini) — features do produtor. Sem a chave, degradam graciosamente.
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

export type Env = z.infer<typeof envSchema>;
