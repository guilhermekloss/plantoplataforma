import { z } from "zod";
import { CROPS, LOTE_STATUSES } from "@plantor/shared";

export const createLoteSchema = z.object({
  crop: z.enum(CROPS),
  season: z.string().min(1),
  areaHectares: z.number().positive(),
  quantityKg: z.number().int().positive(),
  fieldReadingIds: z.array(z.string()).optional().default([]),
});
export type CreateLoteDto = z.infer<typeof createLoteSchema>;

export const updateLoteStatusSchema = z.object({
  status: z.enum(LOTE_STATUSES),
  beneficiamentoLocal: z.string().optional(),
});
export type UpdateLoteStatusDto = z.infer<typeof updateLoteStatusSchema>;
