import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { contractAccessWhere } from "../common/contract-access";
import { CONTRACT_STATUSES, type ContractStatus } from "@plantor/shared";

const UPCOMING_DEADLINE_DAYS = 30;
const ACTIVE_STATUSES: ContractStatus[] = ["PENDENTE_ASSINATURA", "ASSINADO", "ENTREGA_PARCIAL"];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string) {
    const where = contractAccessWhere(tenantId);

    const [byStatusRaw, valueAgg, upcoming, recent] = await Promise.all([
      this.prisma.contract.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.contract.aggregate({
        where: { ...where, status: { notIn: ["RASCUNHO", "CANCELADO"] } },
        _sum: { totalValueCents: true },
      }),
      this.prisma.contract.findMany({
        where: {
          ...where,
          status: { in: ACTIVE_STATUSES },
          deliveryDeadline: { lte: new Date(Date.now() + UPCOMING_DEADLINE_DAYS * 24 * 60 * 60 * 1000) },
        },
        include: { buyerOrg: true, sellerOrg: true },
        orderBy: { deliveryDeadline: "asc" },
        take: 10,
      }),
      this.prisma.contract.findMany({
        where,
        include: { buyerOrg: true, sellerOrg: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const byStatus = Object.fromEntries(CONTRACT_STATUSES.map((s) => [s, 0])) as Record<ContractStatus, number>;
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count._all;
    }

    const totalContracts = Object.values(byStatus).reduce((a, b) => a + b, 0);

    const withCounterparty = <T extends { buyerOrgId: string; buyerOrg: { name: string }; sellerOrg: { name: string } }>(
      contract: T,
    ) => ({
      ...contract,
      counterpartyName: contract.buyerOrgId === tenantId ? contract.sellerOrg.name : contract.buyerOrg.name,
    });

    return {
      totalContracts,
      totalValueCents: valueAgg._sum.totalValueCents ?? 0,
      byStatus,
      upcomingDeadlines: upcoming.map(withCounterparty),
      recentContracts: recent.map(withCounterparty),
    };
  }
}
