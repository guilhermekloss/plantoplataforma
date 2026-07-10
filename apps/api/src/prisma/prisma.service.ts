import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ClsService } from "nestjs-cls";
import { createTenantRlsMiddleware } from "../common/middleware/tenant-rls.middleware";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly cls: ClsService) {
    super();
  }

  async onModuleInit() {
    this.$use(createTenantRlsMiddleware(this.cls));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
