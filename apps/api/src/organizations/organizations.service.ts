import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { OrgType } from "@plantor/shared";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Organization não é filtrada por RLS (comprador precisa buscar orgs de
   * produtor livremente). Usado pelo wizard de criação de contrato.
   */
  search(type: OrgType, query?: string) {
    return this.prisma.organization.findMany({
      where: {
        type,
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
      take: 20,
    });
  }
}
