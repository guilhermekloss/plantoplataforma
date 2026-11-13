import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { createRlsMiddleware } from './rls.middleware';
import { TENANT_CONTEXT_KEY, TenantContext } from './tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly cls: ClsService) {
    super({
      // Sem `query` em produção para não vazar dados pessoais (LGPD) em logs.
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    // RLS: o middleware lê o tenant do CLS (preenchido pelo guard de auth).
    this.$use(createRlsMiddleware(() => this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)));
    await this.$connect();
    this.logger.log('Prisma conectado e middleware de RLS registrado.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
