import { z } from "zod";
import { ORG_TYPES, USER_ROLES } from "@plantor/shared";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const issueInviteSchema = z.object({
  email: z.string().email(),
});
export type IssueInviteDto = z.infer<typeof issueInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  password: z.string().min(8),
  // Só usado quando o convite é para criar uma organização nova
  // (ex.: primeiro usuário de uma fazenda ainda não cadastrada).
  newOrganization: z
    .object({
      name: z.string().min(2),
      type: z.enum(ORG_TYPES),
    })
    .optional(),
});
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

export const userRoleSchema = z.enum(USER_ROLES);
