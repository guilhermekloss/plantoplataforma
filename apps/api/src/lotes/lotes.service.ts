import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { canTransitionLote } from "@plantor/shared";
import type { CreateLoteDto, UpdateLoteStatusDto } from "./dto/lote.schemas";

/** Status que só o OffersModule pode setar (criar oferta / gerar contrato). */
const SYSTEM_MANAGED_STATUSES = new Set(["OFERTADO", "VENDIDO"]);

@Injectable()
export class LotesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLoteDto, tenantId: string) {
    return this.prisma.lote.create({
      data: {
        organizationId: tenantId,
        crop: dto.crop,
        season: dto.season,
        areaHectares: dto.areaHectares,
        quantityKg: dto.quantityKg,
        status: "PLANTADO",
        fieldReadings: dto.fieldReadingIds.length
          ? { connect: dto.fieldReadingIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.lote.findMany({
      where: { organizationId: tenantId },
      include: { fieldReadings: true, offers: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * O middleware de RLS já filtra `findUnique` por `organizationId =
   * tenantId` (Lote é TENANT_OWNED_MODELS) — um lote de outra organização
   * já vem como "não encontrado" (404), nunca aparece pra checar dono aqui.
   */
  async findOwned(id: string, tenantId: string) {
    const lote = await this.prisma.lote.findUnique({ where: { id, organizationId: tenantId } });
    if (!lote) {
      throw new NotFoundException("Lote não encontrado");
    }
    return lote;
  }

  async updateStatus(id: string, tenantId: string, dto: UpdateLoteStatusDto) {
    const lote = await this.findOwned(id, tenantId);

    if (SYSTEM_MANAGED_STATUSES.has(dto.status)) {
      throw new BadRequestException(
        `Status ${dto.status} é definido automaticamente ao criar/converter uma oferta, não diretamente`,
      );
    }
    if (!canTransitionLote(lote.status, dto.status)) {
      throw new BadRequestException(`Transição de status de lote inválida: ${lote.status} -> ${dto.status}`);
    }

    return this.prisma.lote.update({
      where: { id },
      data: { status: dto.status, ...(dto.beneficiamentoLocal ? { beneficiamentoLocal: dto.beneficiamentoLocal } : {}) },
    });
  }
}
