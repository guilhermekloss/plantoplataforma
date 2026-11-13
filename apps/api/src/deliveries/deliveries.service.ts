import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Contract } from '@prisma/client';
import { calculatePriceAdjustment, classifyGrade } from '@plantor/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from '../auth/token.service';
import { assertContractAccess } from '../prisma/contract-access';
import type { CreateDeliveryDto, QualityReportDto } from './deliveries.dto';

type Ctx = { orgId: string };

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AccessTokenPayload, dto: CreateDeliveryDto) {
    const ctx: Ctx = { orgId: user.orgId };
    const contract = await this.loadContractForBuyer(user, dto.contractId);

    if (!['em_execucao', 'entregue_parcial'].includes(contract.status)) {
      throw new BadRequestException('O contrato precisa estar em execução para registrar entregas.');
    }

    // Saldo e criação na MESMA transação serializável: duas entregas simultâneas
    // não conseguem, juntas, exceder o total do contrato.
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.delivery.findMany({
        where: { contractId: dto.contractId },
        select: { quantitySacks: true },
      });
      const alreadyDelivered = existing.reduce((s, d) => s + Number(d.quantitySacks), 0);
      const total = Number(contract.quantitySacks);
      const remaining = total - alreadyDelivered;
      if (dto.quantitySacks > remaining + 1e-9) {
        throw new BadRequestException(
          `Quantidade excede o saldo do contrato. Restam ${remaining} sacas.`,
        );
      }

      const newTotal = alreadyDelivered + dto.quantitySacks;
      const completed = newTotal >= total - 1e-9;

      const delivery = await tx.delivery.create({
        data: {
          contractId: dto.contractId,
          deliveryDate: dto.deliveryDate,
          quantitySacks: dto.quantitySacks,
          nfeKey: dto.nfeKey || null,
          warehouseReceiptNumber: dto.warehouseReceiptNumber || null,
        },
      });
      await tx.contractEvent.create({
        data: {
          contractId: dto.contractId,
          eventType: completed ? 'entregue' : 'entregue_parcial',
          description: completed
            ? `Entrega final: ${dto.quantitySacks} sacas. Contrato liquidado.`
            : `Entrega parcial: ${dto.quantitySacks} sacas (${newTotal}/${total}).`,
          performedById: ctx.orgId === contract.buyerId ? user.sub : null,
        },
      });
      await tx.contract.update({
        where: { id: dto.contractId },
        data: completed
          ? { status: 'liquidado', settledAt: new Date() }
          : { status: 'entregue_parcial' },
      });
      return delivery;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listByContract(user: AccessTokenPayload, contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, buyerId: true, sellerId: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess({ orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role }, contract);
    return this.prisma.delivery.findMany({
      where: { contractId },
      include: { qualityReport: true },
      orderBy: { deliveryDate: 'asc' },
    });
  }

  async addQualityReport(user: AccessTokenPayload, deliveryId: string, dto: QualityReportDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { contract: true, qualityReport: true },
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    this.assertBuyer(user, delivery.contract);
    if (delivery.qualityReport) {
      throw new ConflictException('Esta entrega já possui um laudo.');
    }

    // Grade calculada automaticamente pelos thresholds MAPA do grão do contrato.
    const grade = classifyGrade(delivery.contract.grainType, {
      moisturePct: dto.moisturePct,
      impurityPct: dto.impurityPct,
      damagedPct: dto.damagedPct ?? 0,
      specificWeightGL: dto.specificWeightGL ?? null,
    });

    const priceAdjustmentPct = calculatePriceAdjustment(
      {
        maxMoisturePct: Number(delivery.contract.maxMoisturePct),
        qualityAdjType: delivery.contract.qualityAdjType,
      },
      { moisturePct: dto.moisturePct },
    );
    const qualityAccepted = grade !== 'fora_padrao' && priceAdjustmentPct < 100;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.qualityReport.create({
        data: {
          deliveryId,
          reportNumber: dto.reportNumber,
          laboratoryName: dto.laboratoryName,
          reportDate: dto.reportDate,
          moisturePct: dto.moisturePct,
          impurityPct: dto.impurityPct,
          specificWeightGL: dto.specificWeightGL,
          damagedPct: dto.damagedPct,
          greenPct: dto.greenPct,
          brokenPct: dto.brokenPct,
          ardidosPct: dto.ardidosPct,
          grade,
        },
      });
      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          moisturePct: dto.moisturePct,
          impurityPct: dto.impurityPct,
          specificWeightGL: dto.specificWeightGL,
          damagedPct: dto.damagedPct,
          priceAdjustmentPct,
          qualityAccepted,
        },
      });
      await tx.contractEvent.create({
        data: {
          contractId: delivery.contractId,
          eventType: 'laudo_anexado',
          description: `Laudo ${dto.reportNumber} anexado — grade ${grade}, desconto ${priceAdjustmentPct.toFixed(2)}%.`,
          performedById: user.sub,
          metadata: { grade, priceAdjustmentPct },
        },
      });
      return { ...report, priceAdjustmentPct, qualityAccepted };
    });
  }

  async getQualityReport(user: AccessTokenPayload, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { contract: { select: { buyerId: true, sellerId: true } }, qualityReport: true },
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    assertContractAccess(
      { orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role },
      delivery.contract,
    );
    if (!delivery.qualityReport) throw new NotFoundException('Laudo não encontrado.');
    return delivery.qualityReport;
  }

  /** Liberação manual de pagamento (MVP). */
  async releasePayment(user: AccessTokenPayload, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { contract: true },
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada.');
    this.assertBuyer(user, delivery.contract);
    if (delivery.paymentStatus !== 'pendente') {
      throw new BadRequestException('Pagamento já foi processado.');
    }

    const perSack = delivery.contract.priceValueCents != null
      ? Number(delivery.contract.priceValueCents)
      : 0;
    const discount = delivery.priceAdjustmentPct != null ? Number(delivery.priceAdjustmentPct) : 0;
    const gross = perSack * Number(delivery.quantitySacks);
    const amountCents = Math.round(gross * (1 - discount / 100));

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          paymentStatus: 'liberado',
          paymentReleasedAt: new Date(),
          paymentAmountCents: BigInt(amountCents),
        },
      });
      await tx.contractEvent.create({
        data: {
          contractId: delivery.contractId,
          eventType: 'pagamento_liberado',
          description: `Pagamento liberado para entrega de ${delivery.quantitySacks} sacas.`,
          performedById: user.sub,
        },
      });
      return updated;
    });
  }

  // ---- helpers ----

  private async loadContractForBuyer(user: AccessTokenPayload, contractId: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    this.assertBuyer(user, contract);
    return contract;
  }

  private assertBuyer(
    user: AccessTokenPayload,
    contract: { buyerId: string; sellerId: string },
  ): void {
    assertContractAccess(
      { orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role },
      contract,
    );
    if (contract.buyerId !== user.orgId) {
      throw new ForbiddenException('Apenas o comprador registra entregas e laudos.');
    }
  }
}
