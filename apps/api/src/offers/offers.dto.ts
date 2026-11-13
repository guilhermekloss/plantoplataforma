import { z } from 'zod';

export const createOfferSchema = z.object({
  fieldReadingId: z.string().min(1),
  quantitySacks: z.number().positive().optional(),
  askingPriceCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateOfferDto = z.infer<typeof createOfferSchema>;
