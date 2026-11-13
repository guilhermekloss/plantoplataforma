import { z } from 'zod';

export const assistantSchema = z.object({
  message: z.string().min(1, 'Mensagem vazia').max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});
export type AssistantDto = z.infer<typeof assistantSchema>;
