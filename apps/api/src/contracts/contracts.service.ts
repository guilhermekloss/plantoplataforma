import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Contract, Organization } from '@prisma/client';
import {
  estimateGrossValueCents,
  estimateTotalSacks,
  formatContractNumber,
  indicativePriceCents,
} from '@plantor/shared';
import type { FieldReading, GrainType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Env } from '../config/env.schema';
import { EmailService } from '../email/email.service';
import {
  contractActiveEmail,
  contractAwaitingSignatureEmail,
  contractDisputeEmail,
  contractSignedByProducerEmail,
} from '../email/templates';
import { canonicalSha256 } from '../crypto/canonical-hash';
import type { AccessTokenPayload } from '../auth/token.service';
import { assertContractAccess, contractAccessWhere } from '../prisma/contract-access';
import { buildContractDocument } from './contract-document';
import type { CreateContractDto, ListContractsDto, UpdateContractDto } from './contracts.dto';

type Ctx = { orgId: string; tenantId: string; userId: string; role: string };

function toCtx(user: AccessTokenPayload): Ctx {
  return { orgId: user.orgId, tenantId: user.tenantId, userId: user.sub, role: user.role };
}

const contractInclude = {
  seller: { select: { id: true, name: true, cpf: true, email: true, address: true } },
  buyer: { select: { id: true, name: true, legalName: true, email: true } },
  signatures: true,
} satisfies Prisma.ContractInclude;

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(user: AccessTokenPayload, dto: CreateContractDto): Promise<Contract> {
    const ctx = toCtx(user);

    const [buyer, seller] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: ctx.orgId } }),
      this.prisma.organization.findUnique({ where: { id: dto.sellerId } }),
    ]);
    if (!buyer || (buyer.type !== 'cooperative' && buyer.type !== 'trading')) {
      throw new ForbiddenException('Apenas cooperativa ou trading pode criar contratos.');
    }
    if (!seller || seller.type !== 'producer') {
      throw new BadRequestException('O vendedor deve ser uma organização do tipo produtor.');
    }

    // Anexa um snapshot dos dados de campo (IoT) mais recentes do produtor para
    // esta cultura — assim o contrato carrega contexto agronômico/climático.
    const agronomicData = await this.buildAgronomicSnapshot(dto.sellerId, dto.grainType);

    // contractNumber é @unique e gerado por sequência lida dentro da transação;
    // criações concorrentes podem colidir (P2002) — nesse caso basta tentar de novo.
    return this.retryOnUniqueCollision(() => this.createWithNumber(ctx, dto, agronomicData));
  }

  private async createWithNumber(
    ctx: Ctx,
    dto: CreateContractDto,
    agronomicData: Prisma.InputJsonValue | null,
  ): Promise<Contract> {
    return this.prisma.$transaction(async (tx) => {
      const contractNumber = await this.nextContractNumber(tx);
      const contract = await tx.contract.create({
        data: {
          tenantId: ctx.orgId,
          contractNumber,
          status: 'rascunho',
          sellerId: dto.sellerId,
          buyerId: ctx.orgId,
          createdById: ctx.userId,
          grainType: dto.grainType,
          quantitySacks: dto.quantitySacks,
          sackWeightKg: dto.sackWeightKg,
          harvestYear: dto.harvestYear,
          harvestPeriod: dto.harvestPeriod,
          maxMoisturePct: dto.maxMoisturePct,
          maxImpurityPct: dto.maxImpurityPct,
          minSpecificWeightGL: dto.minSpecificWeightGL,
          maxDamagedPct: dto.maxDamagedPct,
          qualityAdjType: dto.qualityAdjType,
          priceType: dto.priceType,
          priceValueCents: dto.priceValueCents != null ? BigInt(dto.priceValueCents) : null,
          priceCurrency: dto.priceCurrency,
          advancePct: dto.advancePct,
          barterDescription: dto.barterDescription,
          warehouseName: dto.warehouseName,
          warehouseAddress: dto.warehouseAddress as Prisma.InputJsonValue,
          deliveryDeadline: dto.deliveryDeadline,
          transportResponsible: dto.transportResponsible,
          penaltyPct: dto.penaltyPct,
          hasWashoutClause: dto.hasWashoutClause,
          hasForceMajeure: dto.hasForceMajeure,
          arbitrationForum: dto.arbitrationForum,
          agronomicData: agronomicData ?? undefined,
        },
      });
      await tx.contractEvent.create({
        data: {
          contractId: contract.id,
          eventType: 'criado',
          description: `Contrato ${contractNumber} criado como rascunho.`,
          performedById: ctx.userId,
        },
      });
      return contract;
    });
  }

  async findAll(user: AccessTokenPayload, filters: ListContractsDto) {
    const ctx = toCtx(user);
    return this.prisma.contract.findMany({
      where: {
        AND: [
          contractAccessWhere(ctx),
          filters.status ? { status: filters.status } : {},
          filters.grainType ? { grainType: filters.grainType } : {},
          filters.sellerId ? { sellerId: filters.sellerId } : {},
        ],
      },
      include: contractInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AccessTokenPayload, id: string) {
    const ctx = toCtx(user);
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: contractInclude,
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess(ctx, contract);
    return contract;
  }

  async update(user: AccessTokenPayload, id: string, dto: UpdateContractDto): Promise<Contract> {
    const ctx = toCtx(user);
    const contract = await this.loadOwnedByBuyer(ctx, id);
    if (contract.status !== 'rascunho') {
      throw new BadRequestException('Apenas rascunhos podem ser editados.');
    }
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        warehouseAddress: dto.warehouseAddress
          ? (dto.warehouseAddress as Prisma.InputJsonValue)
          : undefined,
        priceValueCents:
          dto.priceValueCents != null ? BigInt(dto.priceValueCents) : undefined,
      },
    });
  }

  async submit(user: AccessTokenPayload, id: string): Promise<Contract> {
    const ctx = toCtx(user);
    const contract = await this.loadOwnedByBuyer(ctx, id);
    if (contract.status !== 'rascunho') {
      throw new BadRequestException('O contrato já foi enviado para assinatura.');
    }
    return this.prisma.contract.update({
      where: { id },
      data: { status: 'pendente_assinatura_comprador' },
    });
  }

  async sign(user: AccessTokenPayload, id: string, ipAddress: string, userAgent: string) {
    const ctx = toCtx(user);
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { signatures: true, buyer: true, seller: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess(ctx, contract);

    const signerRole: 'buyer' | 'seller' = contract.buyerId === ctx.orgId ? 'buyer' : 'seller';

    if (signerRole === 'buyer' && contract.status !== 'pendente_assinatura_comprador') {
      throw new BadRequestException('Não é a vez do comprador assinar.');
    }
    if (signerRole === 'seller' && contract.status !== 'pendente_assinatura_produtor') {
      throw new BadRequestException('Não é a vez do produtor assinar.');
    }
    if (contract.signatures.some((s) => s.signerRole === signerRole)) {
      throw new BadRequestException('Esta parte já assinou o contrato.');
    }

    const documentHashBefore = canonicalSha256(
      buildContractDocument(contract, contract.signatures),
    );
    const signedAt = new Date();
    const documentHashAfter = canonicalSha256(
      buildContractDocument(contract, [
        ...contract.signatures,
        { signerRole, userId: ctx.userId, signedAt, documentHashBefore },
      ]),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.contractSignature.create({
        data: {
          contractId: id,
          userId: ctx.userId,
          signerRole,
          ipAddress,
          userAgent,
          documentHashBefore,
          documentHashAfter,
          signedAt,
        },
      });
      await tx.contractEvent.create({
        data: {
          contractId: id,
          eventType: signerRole === 'buyer' ? 'assinado_comprador' : 'assinado_produtor',
          description:
            signerRole === 'buyer'
              ? 'Contrato assinado pelo comprador.'
              : 'Contrato assinado pelo produtor.',
          performedById: ctx.userId,
          metadata: { documentHashAfter },
        },
      });

      if (signerRole === 'buyer') {
        return tx.contract.update({
          where: { id },
          data: { status: 'pendente_assinatura_produtor', contractHash: documentHashAfter },
        });
      }

      // Produtor assinou → ambas as partes assinaram → assinado → em_execução.
      await tx.contract.update({
        where: { id },
        data: { status: 'assinado', signedAt, contractHash: documentHashAfter },
      });
      await tx.contractEvent.create({
        data: {
          contractId: id,
          eventType: 'em_execucao',
          description: 'Contrato ativo — entregas podem ser registradas.',
          performedById: ctx.userId,
        },
      });
      return tx.contract.update({
        where: { id },
        data: { status: 'em_execucao', executionStartedAt: signedAt },
      });
    });

    await this.notifyAfterSignature(signerRole, contract.buyer, contract.seller, updated.contractNumber);
    return updated;
  }

  async dispute(user: AccessTokenPayload, id: string, reason: string): Promise<Contract> {
    const ctx = toCtx(user);
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { buyer: true, seller: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess(ctx, contract);
    if (!['assinado', 'em_execucao', 'entregue_parcial'].includes(contract.status)) {
      throw new BadRequestException('Só é possível abrir disputa em contratos em execução.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.contractEvent.create({
        data: {
          contractId: id,
          eventType: 'disputado',
          description: `Disputa aberta: ${reason}`,
          performedById: ctx.userId,
        },
      });
      return tx.contract.update({ where: { id }, data: { status: 'disputado' } });
    });

    const { subject, html } = contractDisputeEmail({ contractNumber: contract.contractNumber, reason });
    await this.safeSend([contract.buyer.email, contract.seller.email], subject, html);
    return updated;
  }

  async cancel(user: AccessTokenPayload, id: string, reason: string): Promise<Contract> {
    const ctx = toCtx(user);
    const contract = await this.loadOwnedByBuyer(ctx, id);
    if (['liquidado', 'cancelado'].includes(contract.status)) {
      throw new BadRequestException('Contrato já encerrado.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.contractEvent.create({
        data: {
          contractId: id,
          eventType: 'cancelado',
          description: `Contrato cancelado: ${reason}`,
          performedById: ctx.userId,
        },
      });
      return tx.contract.update({
        where: { id },
        data: { status: 'cancelado', cancelledAt: new Date() },
      });
    });
  }

  async events(user: AccessTokenPayload, id: string) {
    const ctx = toCtx(user);
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      select: { id: true, buyerId: true, sellerId: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess(ctx, contract);
    return this.prisma.contractEvent.findMany({
      where: { contractId: id },
      include: { performedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- helpers ----

  private async retryOnUniqueCollision<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await fn();
      } catch (err) {
        const isUniqueCollision =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isUniqueCollision || attempt >= attempts) throw err;
        this.logger.warn(`Colisão de contractNumber (tentativa ${attempt}); tentando novamente.`);
      }
    }
  }

  private async loadOwnedByBuyer(ctx: Ctx, id: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    assertContractAccess(ctx, contract);
    if (contract.buyerId !== ctx.orgId) {
      throw new ForbiddenException('Apenas o comprador pode realizar esta ação.');
    }
    return contract;
  }

  /** Snapshot dos dados de campo (IoT) mais recentes do produtor para a cultura. */
  private async buildAgronomicSnapshot(
    sellerId: string,
    grainType: GrainType,
  ): Promise<Prisma.InputJsonValue | null> {
    const reading: FieldReading | null = await this.prisma.fieldReading.findFirst({
      where: { organizationId: sellerId, grainType },
      orderBy: { collectedAt: 'desc' },
    });
    if (!reading) return null;

    const yieldSc = Number(reading.yieldSacksPerHa);
    const areaHa = Number(reading.areaHa);
    const priceCents = indicativePriceCents(grainType);

    return {
      source: reading.source ?? 'Agregado IoT',
      collectedAt: reading.collectedAt.toISOString(),
      expectedYieldSacksPerHa: yieldSc,
      areaHa,
      harvestMoisturePct: reading.harvestMoisturePct != null ? Number(reading.harvestMoisturePct) : null,
      ndviAvg: reading.ndviAvg != null ? Number(reading.ndviAvg) : null,
      soilPh: reading.soilPh != null ? Number(reading.soilPh) : null,
      climate: {
        rainfallMmCycle: reading.rainfallMmCycle != null ? Number(reading.rainfallMmCycle) : null,
        gddCycle: reading.gddCycle != null ? Number(reading.gddCycle) : null,
        avgTempC: reading.avgTempC != null ? Number(reading.avgTempC) : null,
        frostEvents: reading.frostEvents,
      },
      reference: {
        pricePerSackCents: priceCents,
        estimatedTotalSacks: estimateTotalSacks(yieldSc, areaHa),
        estimatedGrossValueCents: priceCents != null ? estimateGrossValueCents(yieldSc, areaHa, priceCents) : null,
        note: 'Preço de referência indicativo — não é cotação em tempo real.',
      },
      machineData: reading.machineData ?? undefined,
    } as Prisma.InputJsonValue;
  }

  private async nextContractNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PLT-${year}-`;
    // Range em vez de LIKE: aproveita o índice único de contractNumber.
    const last = await tx.contract.findFirst({
      where: { contractNumber: { gte: prefix, lt: `PLT-${year + 1}-` } },
      orderBy: { contractNumber: 'desc' },
      select: { contractNumber: true },
    });
    const seq = last ? Number(last.contractNumber.slice(prefix.length)) + 1 : 1;
    return formatContractNumber(year, seq);
  }

  private async notifyAfterSignature(
    signerRole: 'buyer' | 'seller',
    buyer: Organization,
    seller: Organization,
    contractNumber: string,
  ): Promise<void> {
    if (signerRole === 'buyer') {
      const { subject, html } = contractAwaitingSignatureEmail({
        contractNumber,
        url: `${this.config.get('APP_WEB_URL', { infer: true })}/contracts`,
      });
      await this.safeSend([seller.email], subject, html);
      return;
    }
    // Produtor assinou → avisa cooperativa + email "ativo" para ambos.
    const signed = contractSignedByProducerEmail({ contractNumber });
    await this.safeSend([buyer.email], signed.subject, signed.html);
    const active = contractActiveEmail({ contractNumber });
    await this.safeSend([buyer.email, seller.email], active.subject, active.html);
  }

  private async safeSend(to: string[], subject: string, html: string): Promise<void> {
    try {
      await Promise.all(to.map((address) => this.email.send({ to: address, subject, html })));
    } catch (err) {
      // Falha de email não deve quebrar a transição de estado já persistida.
      this.logger.error('Falha ao enviar notificação de contrato', err instanceof Error ? err.message : '');
    }
  }
}
