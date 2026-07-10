import { z } from "zod";

export const assistantMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});
export type AssistantMessageDto = z.infer<typeof assistantMessageSchema>;
