import { z } from 'zod';
import { GRAIN_TYPES } from '@plantor/shared';

/** Corpo do webhook de colheita (formato que a OEM enviará na Fase 03). */
export const harvestEventSchema = z.object({
  externalId: z.string().min(1).max(120),
  machine: z.string().min(1).max(120),
  grainType: z.enum(GRAIN_TYPES),
  harvestYear: z.string().regex(/^\d{4}\/\d{4}$/),
  harvestPeriod: z.enum(['primeira', 'segunda', 'unica']),
  areaHa: z.number().positive(),
  yieldSacksPerHa: z.number().positive(),
  harvestMoisturePct: z.number().min(0).max(40),
  fuelLPerHa: z.number().positive().nullable().optional(),
  finishedAt: z.string().datetime(),
  source: z.string().max(160).optional(),
});
export type HarvestEventDto = z.infer<typeof harvestEventSchema>;

export const targetPriceSchema = z.object({
  grainType: z.enum(GRAIN_TYPES),
  /** Preço-alvo por saca em centavos; null remove o alvo. */
  targetPriceCents: z.number().int().positive().nullable(),
});
export type TargetPriceDto = z.infer<typeof targetPriceSchema>;
