import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * Contract (e ContractEvent/Delivery/QualityReport, que dependem dele) é
 * compartilhado entre dois tenants — comprador e vendedor. Por isso NÃO
 * passa pelo filtro cego de RLS (tenant-rls.middleware.ts); o acesso é
 * checado explicitamente aqui: tenantId precisa ser buyerOrgId OU
 * sellerOrgId do contrato.
 */

/** Cláusula `where` para listar só contratos em que o tenant é parte. */
export function contractAccessWhere(tenantId: string): Prisma.ContractWhereInput {
  return { OR: [{ buyerOrgId: tenantId }, { sellerOrgId: tenantId }] };
}

export function isContractParty(
  tenantId: string,
  contract: { buyerOrgId: string; sellerOrgId: string },
): boolean {
  return contract.buyerOrgId === tenantId || contract.sellerOrgId === tenantId;
}

/** Carrega o contrato e garante que tenantId é parte dele; senão 403/404. */
export async function assertContractAccess(
  prisma: PrismaService,
  contractId: string,
  tenantId: string,
) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) {
    throw new NotFoundException("Contrato não encontrado");
  }
  if (!isContractParty(tenantId, contract)) {
    throw new ForbiddenException("Organização não faz parte deste contrato");
  }
  return contract;
}

/** Só o comprador pode registrar entregas/laudos/liberar pagamento. */
export function assertBuyer(tenantId: string, contract: { buyerOrgId: string }) {
  if (contract.buyerOrgId !== tenantId) {
    throw new ForbiddenException("Só a organização compradora pode realizar esta ação");
  }
}
