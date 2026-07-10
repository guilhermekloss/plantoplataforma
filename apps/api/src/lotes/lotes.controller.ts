import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { LotesService } from "./lotes.service";
import {
  createLoteSchema,
  updateLoteStatusSchema,
  type CreateLoteDto,
  type UpdateLoteStatusDto,
} from "./dto/lote.schemas";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("PRODUCER")
@Controller("lotes")
export class LotesController {
  constructor(private readonly lotes: LotesService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createLoteSchema)) dto: CreateLoteDto, @CurrentUser() user: TenantContext) {
    return this.lotes.create(dto, user.tenantId);
  }

  @Get()
  list(@CurrentUser() user: TenantContext) {
    return this.lotes.list(user.tenantId);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLoteStatusSchema)) dto: UpdateLoteStatusDto,
    @CurrentUser() user: TenantContext,
  ) {
    return this.lotes.updateStatus(id, user.tenantId, dto);
  }
}
