import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ContractsService } from "./contracts.service";
import {
  createContractSchema,
  listContractsQuerySchema,
  type CreateContractDto,
  type ListContractsQueryDto,
} from "./dto/contract.schemas";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard)
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createContractSchema)) dto: CreateContractDto, @CurrentUser() user: TenantContext) {
    return this.contracts.create(dto, user.tenantId, user.userId);
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(listContractsQuerySchema)) query: ListContractsQueryDto,
    @CurrentUser() user: TenantContext,
  ) {
    return this.contracts.findAllForTenant(user.tenantId, query.status);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: TenantContext) {
    return this.contracts.findOne(id, user.tenantId);
  }

  @Post(":id/sign")
  sign(@Param("id") id: string, @CurrentUser() user: TenantContext) {
    return this.contracts.sign(id, user.tenantId, user.userId);
  }
}
