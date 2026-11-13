import { z } from 'zod';

/** Tipos de organização que podem se auto-cadastrar (registro direto). */
const registerOrgType = z.enum(['cooperative', 'trading', 'producer']);

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  type: registerOrgType,
  // Aceite explícito dos termos (LGPD — consentimento no cadastro).
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar os termos.' }),
  }),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Senha obrigatória'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken obrigatório'),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const inviteSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  // Nome do produtor (opcional) — exibido no email de convite.
  producerName: z.string().min(2).optional(),
});
export type InviteDto = z.infer<typeof inviteSchema>;

export const acceptInviteSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar os termos.' }),
  }),
});
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;
