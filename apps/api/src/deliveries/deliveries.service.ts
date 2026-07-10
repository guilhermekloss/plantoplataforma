import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { assertBuyer, assertContractAccess, isContractParty } from "../common/contract-access";
import { assertTransition, calculatePriceAdjustment } from "@plantor/shared";
import type { RegisterDeliveryDto, QualityReportDto } from "./dto/delivery.schemas";

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDeliveryDto, tenantId: string, actorUserId: string) {
    const contract = await assertContractAccess(this.prisma, dto.contractId, tenantId);
    assertBuyer(tenantId, contract);

    if (contract.status !== "ASSINADO" && contract.status !== "ENTREGA_PARCIAL") {
      throw new BadRequestException(
        `Só é possível registrar entregas para contratos assinados (status atual: ${contract.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.create({
        data: {
          contractId: contract.id,
          quantityKg: dto.quantityKg,
          deliveredAt: dto.deliveredAt,
          registeredByUserId: actorUserId,
        },
      });

      await tx.contractEvent.create({
        data: {
          contractId: contract.id,
          type: "ENTREGA_REGISTRADA",
          actorUserId,
          payload: { deliveryId: delivery.id, quantityKg: dto.quantityKg },
        },
      });

      const deliveredAgg = await tx.delivery.aggregate({
        where: { contractId: contract.id },
        _sum: { quantityKg: true },
      });
      const totalDelivered = deliveredAgg._sum.quantityKg ?? 0;

      if (totalDelivered >= contract.quantityKg) {
        assertTransition(contract.status, "LIQUIDADO");
        await tx.contract.update({ where: { id: contract.id }, data: { status: "LIQUIDADO" } });
      } else if (contract.status === "ASSINADO") {
        assertTransition(contract.status, "ENTREGA_PARCIAL");
        await tx.contract.update({ where: { id: contract.id }, data: { status: "ENTREGA_PARCIAL" } });
      }

      return delivery;
    });
  }

  async listByContract(contractId: string, tenantId: string) {
    await assertContractAccess(this.prisma, contractId, tenantId);
    return this.prisma.delivery.findMany({
      where: { contractId },
      include: { qualityReport: true, registeredByUser: true },
      orderBy: { deliveredAt: "desc" },
    });
  }

  async addQualityReport(deliveryId: string, dto: QualityReportDto, tenantId: string, actorUserId: string) {
    const { delivery, contract } = await this.loadDeliveryWithContract(deliveryId, tenantId);
    assertBuyer(tenantId, contract);

    if (delivery.qualityReportId) {
      throw new BadRequestException("Esta entrega já tem um laudo de qualidade");
    }

    const grossValueCents = Math.round((delivery.quantityKg / 60) * contract.pricePerSc60Cents);
    const adjustment = calculatePriceAdjustment(dto, grossValueCents);

    return this.prisma.$transaction(async (tx) => {
      const qualityReport = await tx.qualityReport.create({
        data: {
          deliveryId,
          moisturePct: dto.moisturePct,
          impuritiesPct: dto.impuritiesPct,
          brokenGrainsPct: dto.brokenGrainsPct,
          gradeClass: adjustment.gradeClass,
          discountPct: adjustment.discountPct,
          discountValueCents: adjustment.discountValueCents,
          finalValueCents: adjustment.finalValueCents,
        },
      });

      await tx.contractEvent.create({
        data: {
          contractId: contract.id,
          type: "LAUDO_ADICIONADO",
          actorUserId,
          payload: { deliveryId, gradeClass: adjustment.gradeClass, discountPct: adjustment.discountPct },
        },
      });

      return qualityReport;
    });
  }

  async releasePayment(deliveryId: string, tenantId: string, actorUserId: string) {
    const { delivery, contract } = await this.loadDeliveryWithContract(deliveryId, tenantId);
    assertBuyer(tenantId, contract);

    if (delivery.paidAt) {
      throw new BadRequestException("Pagamento desta entrega já foi liberado");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({ where: { id: deliveryId }, data: { paidAt: new Date() } });
      await tx.contractEvent.create({
        data: {
          contractId: contract.id,
          type: "PAGAMENTO_LIBERADO",
          actorUserId,
          payload: { deliveryId },
        },
      });
      return result;
    });

    const sellerUsers = await this.prisma.user.findMany({ where: { organizationId: contract.sellerOrgId } });
    await Promise.all(
      sellerUsers.map((u) =>
        this.email.send({
          to: u.email,
          subject: `Pagamento liberado — contrato ${contract.number}`,
          html: `<p>O pagamento referente a uma entrega do contrato <strong>${contract.number}</strong> foi liberado.</p>`,
        }),
      ),
    );

    return updated;
  }

  private async loadDeliveryWithContract(deliveryId: string, tenantId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { contract: true, qualityReport: true },
    });
    if (!delivery) {
      throw new NotFoundException("Entrega não encontrada");
    }
    if (!isContractParty(tenantId, delivery.contract)) {
      throw new ForbiddenException("Organização não faz parte do contrato desta entrega");
    }
    return { delivery: { ...delivery, qualityReportId: delivery.qualityReport?.id }, contract: delivery.contract };
  }
}
