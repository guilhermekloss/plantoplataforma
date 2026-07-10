import { z } from "zod";
import { CONTRACT_STATUSES, CROPS } from "@plantor/shared";

export const createContractSchema = z.object({
  sellerOrgId: z.string().min(1),
  crop: z.enum(CROPS),
  quantityKg: z.number().int().positive(),
  pricePerSc60Cents: z.number().int().positive(),
  deliveryDeadline: z.coerce.date(),
});
export type CreateContractDto = z.infer<typeof createContractSchema>;

export const listContractsQuerySchema = z.object({
  status: z.enum(CONTRACT_STATUSES).optional(),
});
export type ListContractsQueryDto = z.infer<typeof listContractsQuerySchema>;
