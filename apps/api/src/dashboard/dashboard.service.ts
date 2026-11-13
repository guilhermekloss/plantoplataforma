import { Injectable } from '@nestjs/common';
import type { ContractStatus, GrainType } from '@plantor/shared';
import { ACTIVE_CONTRACT_STATUSES, indicativePriceCents } from '@plantor/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/token.service';
import { contractAccessWhere } from '../prisma/contract-access';

export type AlertLevel = 'urgente' | 'atencao' | 'pendente' | 'acao';

export interface DashboardAlert {
  level: AlertLevel;
  message: string;
  contractId: string;
  contractNumber: string;
}

const DAY = 24 * 3600 * 1000;
const TERMINAL: ContractStatus[] = ['liquidado', 'cancelado'];

// Ordem de urgência para o painel de alertas.
const ALERT_ORDER: Record<AlertLevel, number> = { urgente: 0, atencao: 1, pendente: 2, acao: 3 };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AccessTokenPayload) {
    const ctx = { orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role };
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * DAY);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const contracts = await this.prisma.contract.findMany({
      where: contractAccessWhere(ctx),
      include: {
        deliveries: {
          select: { quantitySacks: true, paymentStatus: true, paymentAmountCents: true },
        },
        seller: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const isProducer = user.role === 'producer';

    // Ofertas abertas no mercado (relevante para o comprador).
    const openMarketOffers = isProducer
      ? 0
      : await this.prisma.offer.count({
          where: { status: { in: ['disponivel', 'em_negociacao'] } },
        });

    // KPIs (cooperativa/trading)
    let activeContracts = 0;
    let committedSacksMonth = 0;
    let openValueCents = 0;
    let deliveriesDue30 = 0;
    const alerts: DashboardAlert[] = [];
    const statusCount = new Map<ContractStatus, number>();

    // Financeiro do produtor (contratos em que a organização vende)
    let soldSacks = 0;
    let contractedValueCents = 0;
    let receivedCents = 0;

    // Compras do comprador, agregadas por grão
    const purchaseByGrain = new Map<GrainType, { sacks: number; valueCents: number }>();

    for (const c of contracts) {
      statusCount.set(c.status, (statusCount.get(c.status) ?? 0) + 1);

      if (c.status !== 'rascunho' && c.status !== 'cancelado') {
        const qty = Number(c.quantitySacks);
        const valueCents = c.priceValueCents != null ? Number(c.priceValueCents) * qty : 0;
        if (c.sellerId === ctx.orgId) {
          soldSacks += qty;
          contractedValueCents += valueCents;
          receivedCents += c.deliveries.reduce(
            (s, d) =>
              s +
              (d.paymentStatus === 'pago' && d.paymentAmountCents != null
                ? Number(d.paymentAmountCents)
                : 0),
            0,
          );
        }
        if (c.buyerId === ctx.orgId && c.priceValueCents != null) {
          const g = purchaseByGrain.get(c.grainType) ?? { sacks: 0, valueCents: 0 };
          g.sacks += qty;
          g.valueCents += valueCents;
          purchaseByGrain.set(c.grainType, g);
        }
      }

      if (ACTIVE_CONTRACT_STATUSES.includes(c.status)) activeContracts += 1;

      if (c.buyerId === ctx.orgId && c.createdAt >= monthStart) {
        committedSacksMonth += Number(c.quantitySacks);
      }

      if (!TERMINAL.includes(c.status) && c.status !== 'rascunho' && c.priceValueCents != null) {
        openValueCents += Number(c.priceValueCents) * Number(c.quantitySacks);
      }

      const deadline = c.deliveryDeadline;
      const deliveredSacks = c.deliveries.reduce((s, d) => s + Number(d.quantitySacks), 0);

      if (deadline <= in30 && deadline >= now && !TERMINAL.includes(c.status)) {
        deliveriesDue30 += 1;
      }

      // ---- Alertas (apenas para comprador) ----
      if (!isProducer) {
        if (deadline < now && !TERMINAL.includes(c.status) && deliveredSacks === 0) {
          alerts.push({
            level: 'urgente',
            message: `Contrato vencido sem entrega`,
            contractId: c.id,
            contractNumber: c.contractNumber,
          });
        } else if (deadline <= in30 && deadline >= now && c.status !== 'em_execucao' && !TERMINAL.includes(c.status)) {
          alerts.push({
            level: 'atencao',
            message: `Entrega em ≤ 30 dias sem execução`,
            contractId: c.id,
            contractNumber: c.contractNumber,
          });
        }
        if (c.status === 'pendente_assinatura_produtor' && now.getTime() - c.updatedAt.getTime() > 3 * DAY) {
          alerts.push({
            level: 'pendente',
            message: `Aguardando assinatura do produtor há mais de 3 dias`,
            contractId: c.id,
            contractNumber: c.contractNumber,
          });
        }
        if (c.deliveries.some((d) => d.paymentStatus === 'pendente')) {
          alerts.push({
            level: 'acao',
            message: `Entrega confirmada aguardando liberação de pagamento`,
            contractId: c.id,
            contractNumber: c.contractNumber,
          });
        }
      }
    }

    alerts.sort((a, b) => ALERT_ORDER[a.level] - ALERT_ORDER[b.level]);

    const statusDistribution = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    const recentContracts = contracts.slice(0, 5).map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      status: c.status,
      grainType: c.grainType,
      quantitySacks: c.quantitySacks.toString(),
      deliveryDeadline: c.deliveryDeadline.toISOString(),
      counterpartyName: isProducer ? c.buyer?.name : c.seller?.name,
    }));

    // Métricas do produtor
    const toSign = contracts.filter((c) => c.status === 'pendente_assinatura_produtor').length;
    const pendingDeliveries = contracts.filter((c) =>
      ACTIVE_CONTRACT_STATUSES.includes(c.status),
    ).length;

    return {
      orgType: isProducer ? 'producer' : 'buyer',
      kpis: {
        activeContracts,
        committedSacksMonth,
        openValueCents: String(openValueCents),
        deliveriesDue30,
      },
      alerts,
      statusDistribution,
      recentContracts,
      producer: {
        toSign,
        pendingDeliveries,
        totalContracts: contracts.length,
        soldSacks,
        contractedValueCents: String(contractedValueCents),
        receivedCents: String(receivedCents),
        receivableCents: String(Math.max(0, contractedValueCents - receivedCents)),
      },
      buyer: {
        openMarketOffers,
        purchasesByGrain: Array.from(purchaseByGrain.entries()).map(([grainType, v]) => ({
          grainType,
          sacks: v.sacks,
          avgPriceCents: v.sacks > 0 ? Math.round(v.valueCents / v.sacks) : null,
          refPriceCents: indicativePriceCents(grainType),
        })),
      },
    };
  }
}
