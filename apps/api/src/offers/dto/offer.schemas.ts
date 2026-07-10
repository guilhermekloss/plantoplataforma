import { z } from "zod";

export const createOfferSchema = z.object({
  loteId: z.string().min(1),
  expectedPriceCents: z.number().int().positive().optional(),
});
export type CreateOfferDto = z.infer<typeof createOfferSchema>;

export const generateContractSchema = z.object({
  pricePerSc60Cents: z.number().int().positive(),
  deliveryDeadline: z.coerce.date(),
});
export type GenerateContractDto = z.infer<typeof generateContractSchema>;
