import type { Prisma } from '@prisma/client';
import type { TenantContext } from './tenant-context';
import { TENANT_OWNED_MODELS } from './tenant-context';

/**
 * Middleware de RLS (Row-Level Security) via Prisma.
 *
 * Injeta o filtro CEGO por tenantId nos models tenant-owned (TENANT_OWNED_MODELS),
 * lendo o tenant SEMPRE do contexto autenticado (nunca do client).
 *
 * Exceções (não filtradas aqui — ver tenant-context.ts e contract-access.ts):
 * - Contract e seus filhos seguem a regra buyer/seller na camada de serviço.
 *
 * Operações afetadas: leituras e mutações que aceitam `where`.
 */
const WHERE_OPERATIONS: ReadonlySet<Prisma.PrismaAction> = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'updateMany',
  'deleteMany',
  'update',
  'delete',
]);

export function createRlsMiddleware(getContext: () => TenantContext | undefined): Prisma.Middleware {
  return async (params, next) => {
    const model = params.model;
    if (model && TENANT_OWNED_MODELS.includes(model) && WHERE_OPERATIONS.has(params.action)) {
      const ctx = getContext();
      if (!ctx) {
        // Sem contexto de tenant, uma operação em model tenant-owned é insegura.
        throw new Error(
          `RLS: operação ${params.action} em ${model} sem contexto de tenant autenticado.`,
        );
      }
      params.args = params.args ?? {};
      params.args.where = { ...params.args.where, tenantId: ctx.tenantId };
    }
    return next(params);
  };
}
