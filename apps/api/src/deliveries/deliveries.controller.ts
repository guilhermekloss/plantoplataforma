import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DeliveriesService } from "./deliveries.service";
import {
  listDeliveriesQuerySchema,
  qualityReportSchema,
  registerDeliverySchema,
  type ListDeliveriesQueryDto,
  type QualityReportDto,
  type RegisterDeliveryDto,
} from "./dto/delivery.schemas";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard)
@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Post()
  register(@Body(new ZodValidationPipe(registerDeliverySchema)) dto: RegisterDeliveryDto, @CurrentUser() user: TenantContext) {
    return this.deliveries.register(dto, user.tenantId, user.userId);
  }

  @Get()
  list(@Query(new ZodValidationPipe(listDeliveriesQuerySchema)) query: ListDeliveriesQueryDto, @CurrentUser() user: TenantContext) {
    return this.deliveries.listByContract(query.contractId, user.tenantId);
  }

  @Post(":id/quality-report")
  addQualityReport(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(qualityReportSchema)) dto: QualityReportDto,
    @CurrentUser() user: TenantContext,
  ) {
    return this.deliveries.addQualityReport(id, dto, user.tenantId, user.userId);
  }

  @Post(":id/release-payment")
  releasePayment(@Param("id") id: string, @CurrentUser() user: TenantContext) {
    return this.deliveries.releasePayment(id, user.tenantId, user.userId);
  }
}
