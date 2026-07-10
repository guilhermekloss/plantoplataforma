import { ClsService } from "nestjs-cls";
import type { UserRole } from "@plantor/shared";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: UserRole;
  name: string;
}

const TENANT_CONTEXT_KEY = "tenantContext";

/** Chamado pelo JwtAuthGuard após validar o token, uma vez por request. */
export function setTenantContext(cls: ClsService, context: TenantContext): void {
  cls.set(TENANT_CONTEXT_KEY, context);
}

/** Usado pelo middleware de RLS e por contract-access.ts. Lança se chamado fora de uma request autenticada. */
export function getTenantContext(cls: ClsService): TenantContext {
  const context = cls.get<TenantContext>(TENANT_CONTEXT_KEY);
  if (!context) {
    throw new Error("Tenant context não disponível — chamado fora de uma request autenticada?");
  }
  return context;
}

export function tryGetTenantContext(cls: ClsService): TenantContext | undefined {
  return cls.get<TenantContext>(TENANT_CONTEXT_KEY);
}
