import { BadRequestException, Injectable } from "@nestjs/common";
import type { ContractStatus as PrismaContractStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { FieldDataService } from "../field-data/field-data.service";
import { assertContractAccess, contractAccessWhere } from "../common/contract-access";
import { assertTransition, hashContract, kgToSacas, type ContractStatus } from "@plantor/shared";
// @plantor/shared usa uma union de string literais própria (não depende de
// @prisma/client); os valores são idênticos aos do enum gerado pelo Prisma,
// então convertemos na borda ao chamar o Prisma Client.
import type { CreateContractDto } from "./dto/contract.schemas";

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly fieldData: FieldDataService,
  ) {}

  async create(dto: CreateContractDto, buyerOrgId: string, actorUserId: string) {
    const totalValueCents = Math.round((dto.quantityKg / 60) * dto.pricePerSc60Cents);

    // Snapshot da última leitura de campo do produtor pra essa cultura —
    // anexado ao contrato no momento da criação (dado já existe, não pede
    // pro produtor preencher de novo).
    const latestReading = await this.fieldData.latestReadingFor(dto.sellerOrgId, dto.crop);
    const agronomicData = latestReading
      ? {
          fieldReadingId: latestReading.id,
          season: latestReading.season,
          yieldScHa: latestReading.yieldScHa,
          harvestMoisture: latestReading.harvestMoisture,
          ndvi: latestReading.ndvi,
          rainfallMm: latestReading.rainfallMm,
          readingDate: latestReading.readingDate,
        }
      : null;

    const contract = await this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const sequence = await tx.contractSequence.upsert({
        where: { year },
        create: { year, value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = `PLT-${year}-${String(sequence.value).padStart(4, "0")}`;

      const created = await tx.contract.create({
        data: {
          number,
          buyerOrgId,
          sellerOrgId: dto.sellerOrgId,
          crop: dto.crop,
          quantityKg: dto.quantityKg,
          pricePerSc60Cents: dto.pricePerSc60Cents,
          totalValueCents,
          deliveryDeadline: dto.deliveryDeadline,
          status: "PENDENTE_ASSINATURA",
          agronomicData: agronomicData ?? undefined,
        },
      });

      await tx.contractEvent.create({
        data: {
          contractId: created.id,
          type: "CRIADO",
          actorUserId,
          payload: { number, crop: dto.crop, quantityKg: dto.quantityKg, totalValueCents },
        },
      });

      return created;
    });

    await this.notifySellerOfNewContract(contract.sellerOrgId, contract.number, contract.id, contract.quantityKg);
    return contract;
  }

  async findAllForTenant(tenantId: string, status?: ContractStatus) {
    return this.prisma.contract.findMany({
      where: { ...contractAccessWhere(tenantId), ...(status ? { status: status as PrismaContractStatus } : {}) },
      include: { buyerOrg: true, sellerOrg: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, tenantId: string) {
    await assertContractAccess(this.prisma, id, tenantId);
    return this.prisma.contract.findUniqueOrThrow({
      where: { id },
      include: {
        buyerOrg: true,
        sellerOrg: true,
        events: { orderBy: { createdAt: "desc" }, include: { actorUser: true } },
        deliveries: { include: { qualityReport: true } },
      },
    });
  }

  async sign(id: string, tenantId: string, actorUserId: string) {
    const contract = await assertContractAccess(this.prisma, id, tenantId);

    if (contract.status !== "PENDENTE_ASSINATURA") {
      throw new BadRequestException(`Contrato não está pendente de assinatura (status atual: ${contract.status})`);
    }

    const isBuyer = tenantId === contract.buyerOrgId;
    const alreadySigned = isBuyer ? contract.signedByBuyerAt : contract.signedBySellerAt;
    if (alreadySigned) {
      throw new BadRequestException("Sua organização já assinou este contrato");
    }

    const now = new Date();
    const signedByBuyerAt = isBuyer ? now : contract.signedByBuyerAt;
    const signedBySellerAt = isBuyer ? contract.signedBySellerAt : now;
    const bothSigned = Boolean(signedByBuyerAt && signedBySellerAt);

    const updated = await this.prisma.$transaction(async (tx) => {
      let contractHash: string | undefined;
      if (bothSigned) {
        assertTransition(contract.status, "ASSINADO");
        contractHash = hashContract({
          number: contract.number,
          buyerOrgId: contract.buyerOrgId,
          sellerOrgId: contract.sellerOrgId,
          crop: contract.crop,
          quantityKg: contract.quantityKg,
          pricePerSc60Cents: contract.pricePerSc60Cents,
          totalValueCents: contract.totalValueCents,
          deliveryDeadline: contract.deliveryDeadline,
          signedByBuyerAt,
          signedBySellerAt,
        });
      }

      const result = await tx.contract.update({
        where: { id },
        data: {
          signedByBuyerAt,
          signedBySellerAt,
          ...(bothSigned ? { status: "ASSINADO", contractHash } : {}),
        },
      });

      await tx.contractEvent.create({
        data: {
          contractId: id,
          type: bothSigned ? "ASSINADO" : "STATUS_ALTERADO",
          actorUserId,
          payload: bothSigned ? { contractHash } : { signedBy: isBuyer ? "buyer" : "seller" },
        },
      });

      return result;
    });

    if (bothSigned) {
      await this.notifyBothPartiesSigned(contract.buyerOrgId, contract.sellerOrgId, contract.number, id);
    }

    return updated;
  }

  private async notifySellerOfNewContract(
    sellerOrgId: string,
    contractNumber: string,
    contractId: string,
    quantityKg: number,
  ) {
    const users = await this.prisma.user.findMany({ where: { organizationId: sellerOrgId } });
    const sacas = kgToSacas(quantityKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    await Promise.all(
      users.map((u) =>
        this.email.send({
          to: u.email,
          subject: `Novo contrato ${contractNumber} para assinatura`,
          html: `<p>Você recebeu o contrato <strong>${contractNumber}</strong> (${sacas} sc) para revisar e assinar na Plantor. Contrato: ${contractId}.</p>`,
        }),
      ),
    );
  }

  private async notifyBothPartiesSigned(buyerOrgId: string, sellerOrgId: string, contractNumber: string, contractId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: { in: [buyerOrgId, sellerOrgId] } },
    });
    await Promise.all(
      users.map((u) =>
        this.email.send({
          to: u.email,
          subject: `Contrato ${contractNumber} assinado por ambas as partes`,
          html: `<p>O contrato <strong>${contractNumber}</strong> foi assinado por comprador e vendedor. Contrato: ${contractId}.</p>`,
        }),
      ),
    );
  }
}
