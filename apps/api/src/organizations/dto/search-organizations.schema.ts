import { z } from "zod";
import { ORG_TYPES } from "@plantor/shared";

export const searchOrganizationsSchema = z.object({
  type: z.enum(ORG_TYPES),
  q: z.string().optional(),
});
export type SearchOrganizationsDto = z.infer<typeof searchOrganizationsSchema>;
