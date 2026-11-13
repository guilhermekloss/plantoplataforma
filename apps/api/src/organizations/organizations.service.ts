import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ProducerSummary {
  id: string;
  name: string;
  cpf: string | null;
  city: string | null;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca produtores cadastrados por nome ou CPF (autocomplete do wizard).
   * Retorna apenas campos necessários para o card de seleção.
   */
  async searchProducers(query: string | undefined): Promise<ProducerSummary[]> {
    const where: Prisma.OrganizationWhereInput = {
      type: 'producer',
      isActive: true,
    };
    if (query && query.trim().length > 0) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { cpf: { contains: q } },
      ];
    }
    const orgs = await this.prisma.organization.findMany({
      where,
      select: { id: true, name: true, cpf: true, address: true },
      take: 10,
      orderBy: { name: 'asc' },
    });
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      cpf: o.cpf,
      city: this.extractCity(o.address),
    }));
  }

  private extractCity(address: Prisma.JsonValue): string | null {
    if (address && typeof address === 'object' && !Array.isArray(address)) {
      const city = (address as Record<string, unknown>).city;
      return typeof city === 'string' ? city : null;
    }
    return null;
  }
}
