import { z } from 'zod';
import { isValidNfeKey } from '@plantor/shared';

export const createDeliverySchema = z.object({
  contractId: z.string().min(1),
  deliveryDate: z.coerce.date(),
  quantitySacks: z.number().positive('Quantidade deve ser maior que zero'),
  nfeKey: z
    .string()
    .optional()
    .refine((v) => v == null || v === '' || isValidNfeKey(v), {
      message: 'A chave da NFe deve ter 44 dígitos numéricos',
    }),
  warehouseReceiptNumber: z.string().optional(),
});
export type CreateDeliveryDto = z.infer<typeof createDeliverySchema>;

export const qualityReportSchema = z.object({
  reportNumber: z.string().min(1, 'Informe o número do laudo'),
  laboratoryName: z.string().min(1, 'Informe o laboratório'),
  reportDate: z.coerce.date(),
  moisturePct: z.number().min(0).max(100),
  impurityPct: z.number().min(0).max(100),
  specificWeightGL: z.number().positive().optional(),
  damagedPct: z.number().min(0).max(100).optional(),
  greenPct: z.number().min(0).max(100).optional(),
  brokenPct: z.number().min(0).max(100).optional(),
  ardidosPct: z.number().min(0).max(100).optional(),
});
export type QualityReportDto = z.infer<typeof qualityReportSchema>;
