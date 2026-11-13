import { z } from 'zod';
import {
  CONTRACT_STATUSES,
  GRAIN_TYPES,
  HARVEST_PERIODS,
  PRICE_TYPES,
  QUALITY_ADJ_TYPES,
} from '@plantor/shared';

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().min(1, 'UF obrigatória'),
  zip: z.string().optional(),
  country: z.string().optional(),
});

const decimal = z.number().positive('Deve ser maior que zero');
const pct = z.number().min(0).max(100);

export const createContractSchema = z
  .object({
    sellerId: z.string().min(1, 'Selecione o produtor'),

    // Objeto
    grainType: z.enum(GRAIN_TYPES),
    quantitySacks: decimal,
    sackWeightKg: decimal.default(60),
    harvestYear: z.string().regex(/^\d{4}\/\d{4}$/, 'Use o formato 2025/2026'),
    harvestPeriod: z.enum(HARVEST_PERIODS),

    // Qualidade (defaults MAPA preenchidos no frontend)
    maxMoisturePct: pct.default(14),
    maxImpurityPct: pct.default(1),
    minSpecificWeightGL: z.number().positive().optional(),
    maxDamagedPct: pct.optional(),
    qualityAdjType: z.enum(QUALITY_ADJ_TYPES),

    // Preço
    priceType: z.enum(PRICE_TYPES),
    priceValueCents: z.union([z.number().int().nonnegative(), z.string()]).optional(),
    priceCurrency: z.enum(['BRL', 'USD']).default('BRL'),
    advancePct: pct.optional(),
    barterDescription: z.string().optional(),

    // Entrega
    warehouseName: z.string().min(1, 'Informe o armazém'),
    warehouseAddress: addressSchema,
    deliveryDeadline: z.coerce.date(),
    transportResponsible: z.enum(['seller', 'buyer']),

    // Penalidades
    penaltyPct: pct.default(10),
    hasWashoutClause: z.boolean().default(true),
    hasForceMajeure: z.boolean().default(true),
    arbitrationForum: z.string().optional(),
  })
  .refine((d) => d.deliveryDeadline.getTime() > Date.now(), {
    message: 'A data limite de entrega não pode estar no passado',
    path: ['deliveryDeadline'],
  })
  // B3 desabilitado no MVP (Etapa 3 do wizard)
  .refine((d) => d.priceType !== 'indexado_b3' && d.priceType !== 'indexado_cbot', {
    message: 'Preço indexado (B3/CBOT) será habilitado em fase futura',
    path: ['priceType'],
  });

export type CreateContractDto = z.infer<typeof createContractSchema>;

// Atualização de rascunho — todos os campos opcionais (partial), sem refine de data
// no passado para permitir salvar parcialmente; validação forte ocorre no submit.
export const updateContractSchema = z.object({
  grainType: z.enum(GRAIN_TYPES).optional(),
  quantitySacks: decimal.optional(),
  sackWeightKg: decimal.optional(),
  harvestYear: z.string().regex(/^\d{4}\/\d{4}$/).optional(),
  harvestPeriod: z.enum(HARVEST_PERIODS).optional(),
  maxMoisturePct: pct.optional(),
  maxImpurityPct: pct.optional(),
  minSpecificWeightGL: z.number().positive().optional(),
  maxDamagedPct: pct.optional(),
  qualityAdjType: z.enum(QUALITY_ADJ_TYPES).optional(),
  priceType: z.enum(['fixo', 'media_mercado']).optional(),
  priceValueCents: z.union([z.number().int().nonnegative(), z.string()]).optional(),
  priceCurrency: z.enum(['BRL', 'USD']).optional(),
  advancePct: pct.optional(),
  barterDescription: z.string().optional(),
  warehouseName: z.string().min(1).optional(),
  warehouseAddress: addressSchema.optional(),
  deliveryDeadline: z.coerce.date().optional(),
  transportResponsible: z.enum(['seller', 'buyer']).optional(),
  penaltyPct: pct.optional(),
  hasWashoutClause: z.boolean().optional(),
  hasForceMajeure: z.boolean().optional(),
  arbitrationForum: z.string().optional(),
});
export type UpdateContractDto = z.infer<typeof updateContractSchema>;

export const listContractsSchema = z.object({
  status: z.enum(CONTRACT_STATUSES).optional(),
  grainType: z.enum(GRAIN_TYPES).optional(),
  sellerId: z.string().optional(),
});
export type ListContractsDto = z.infer<typeof listContractsSchema>;

export const reasonSchema = z.object({
  reason: z.string().min(3, 'Informe o motivo'),
});
export type ReasonDto = z.infer<typeof reasonSchema>;

export const signSchema = z.object({
  // Aceite explícito do conteúdo do contrato no momento da assinatura.
  accept: z.literal(true, { errorMap: () => ({ message: 'É necessário confirmar a assinatura.' }) }),
});
export type SignDto = z.infer<typeof signSchema>;
