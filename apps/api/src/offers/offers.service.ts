import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsService } from "../contracts/contracts.service";
import type { CreateOfferDto, GenerateContractDto } from "./dto/offer.schemas";

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly contracts: ContractsService,
  ) {}

  /** Produtor oferta um lote DISPONIVEL — mesma org, sem leitura cross-tenant. */
  async create(dto: CreateOfferDto, tenantId: string) {
    const lote = await this.prisma.lote.findUnique({ where: { id: dto.loteId } });
    if (!lote) {
      throw new NotFoundException("Lote não encontrado");
    }
    if (lote.status !== "DISPONIVEL") {
      throw new BadRequestException(`Só é possível ofertar lotes DISPONIVEL (status atual: ${lote.status})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          organizationId: tenantId,
          loteId: lote.id,
          crop: lote.crop,
          quantityKg: lote.quantityKg,
          expectedPriceCents: dto.expectedPriceCents,
          status: "ABERTA",
        },
      });
      await tx.lote.update({ where: { id: lote.id }, data: { status: "OFERTADO" } });
      return offer;
    });
  }

  /** Ofertas do próprio produtor (RLS filtra naturalmente, mesma org). */
  listMine(tenantId: string) {
    return this.prisma.offer.findMany({
      where: { organizationId: tenantId },
      include: { lote: true, contract: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Inbox da cooperativa: TODAS as ofertas abertas, de QUALQUER produtor —
   * leitura cross-tenant deliberada (mesmo padrão de field-data.service.ts:
   * `cls.exit()` com `await` interno à query, pra não deixar o middleware
   * de RLS filtrar cego pelo tenant do comprador autenticado).
   */
  async listMarket() {
    return this.cls.exit(async () => {
      return await this.prisma.offer.findMany({
        where: { status: "ABERTA" },
        include: { organization: true, lote: true },
        orderBy: { createdAt: "desc" },
      });
    });
  }

  /** Cooperativa gera contrato em 1 clique a partir de uma oferta. */
  async generateContract(offerId: string, buyerTenantId: string, actorUserId: string, dto: GenerateContractDto) {
    const offer = await this.cls.exit(async () => {
      return await this.prisma.offer.findUnique({ where: { id: offerId } });
    });
    if (!offer) {
      throw new NotFoundException("Oferta não encontrada");
    }
    if (offer.status !== "ABERTA") {
      throw new BadRequestException(`Oferta não está aberta (status atual: ${offer.status})`);
    }

    const contract = await this.contracts.create(
      {
        sellerOrgId: offer.organizationId,
        crop: offer.crop,
        quantityKg: offer.quantityKg,
        pricePerSc60Cents: dto.pricePerSc60Cents,
        deliveryDeadline: dto.deliveryDeadline,
      },
      buyerTenantId,
      actorUserId,
    );

    await this.cls.exit(async () => {
      await this.prisma.$transaction(async (tx) => {
        await tx.offer.update({ where: { id: offer.id }, data: { status: "CONVERTIDA", contractId: contract.id } });
        if (offer.loteId) {
          await tx.lote.update({ where: { id: offer.loteId }, data: { status: "VENDIDO" } });
        }
      });
    });

    return contract;
  }
}
