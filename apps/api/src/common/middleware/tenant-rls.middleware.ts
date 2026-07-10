import { Prisma } from "@prisma/client";
import type { ClsService } from "nestjs-cls";
import { TENANT_OWNED_MODELS } from "@plantor/shared";
import { tryGetTenantContext } from "../cls/tenant-context";

const FILTERED_ACTIONS = new Set<Prisma.PrismaAction>([
  "findFirst",
  "findMany",
  "findUnique",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

/**
 * Middleware Prisma `$use` que filtra CEGO por tenant (organizationId) só
 * os models em TENANT_OWNED_MODELS. Contract e dependentes NÃO passam por
 * aqui — são compartilhados entre comprador/vendedor e usam
 * contract-access.ts (checagem explícita), não filtro cego. Organization
 * também não é filtrada (comprador precisa buscar orgs de produtor).
 */
export function createTenantRlsMiddleware(cls: ClsService): Prisma.Middleware {
  return async (params, next) => {
    if (
      params.model &&
      (TENANT_OWNED_MODELS as readonly string[]).includes(params.model) &&
      FILTERED_ACTIONS.has(params.action)
    ) {
      const context = tryGetTenantContext(cls);
      if (context) {
        params.args = params.args ?? {};
        params.args.where = { ...params.args.where, organizationId: context.tenantId };
      }
    }
    return next(params);
  };
}
