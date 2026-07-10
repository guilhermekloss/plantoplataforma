import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  INVITE_JWT_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
