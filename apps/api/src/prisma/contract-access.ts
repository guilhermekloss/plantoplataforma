import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TenantContext } from './tenant-context';

/**
 * Regra de acesso ao Contract (exceção de multi-tenancy do PROMPT_MVP.md).
 *
 * Um usuário pode acessar um Contract se a org dele for COMPRADOR OU VENDEDOR.
 * Use sempre este filtro em queries de Contract — nunca o filtro cego por
 * tenantId, pois o produtor (seller) vive em outro tenant.
 */
export function contractAccessWhere(ctx: TenantContext): Prisma.ContractWhereInput {
  return {
    OR: [{ buyerId: ctx.orgId }, { sellerId: ctx.orgId }],
  };
}

/**
 * Garante, na camada de serviço, que o usuário pode acessar o contrato pai antes
 * de ler/escrever seus filhos (ContractEvent, ContractSignature, Delivery,
 * QualityReport). Lança 403 caso contrário.
 */
export function assertContractAccess(
  ctx: TenantContext,
  contract: { buyerId: string; sellerId: string } | null,
): void {
  if (!contract || (contract.buyerId !== ctx.orgId && contract.sellerId !== ctx.orgId)) {
    throw new ForbiddenException('Você não tem acesso a este contrato.');
  }
}

/** True se a org do contexto é o comprador do contrato. */
export function isBuyer(ctx: TenantContext, contract: { buyerId: string }): boolean {
  return contract.buyerId === ctx.orgId;
}

/** True se a org do contexto é o vendedor (produtor) do contrato. */
export function isSeller(ctx: TenantContext, contract: { sellerId: string }): boolean {
  return contract.sellerId === ctx.orgId;
}
