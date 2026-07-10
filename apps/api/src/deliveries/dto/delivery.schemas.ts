import { z } from "zod";

export const registerDeliverySchema = z.object({
  contractId: z.string().min(1),
  quantityKg: z.number().int().positive(),
  deliveredAt: z.coerce.date(),
});
export type RegisterDeliveryDto = z.infer<typeof registerDeliverySchema>;

export const qualityReportSchema = z.object({
  moisturePct: z.number().min(0).max(100),
  impuritiesPct: z.number().min(0).max(100),
  brokenGrainsPct: z.number().min(0).max(100),
});
export type QualityReportDto = z.infer<typeof qualityReportSchema>;

export const listDeliveriesQuerySchema = z.object({
  contractId: z.string().min(1),
});
export type ListDeliveriesQueryDto = z.infer<typeof listDeliveriesQuerySchema>;
