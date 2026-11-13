import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AccessTokenPayload } from '../auth/token.service';
import { DeliveriesService } from './deliveries.service';
import {
  createDeliverySchema,
  qualityReportSchema,
  type CreateDeliveryDto,
  type QualityReportDto,
} from './deliveries.dto';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Roles('admin', 'operator')
  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createDeliverySchema)) dto: CreateDeliveryDto,
  ) {
    return this.deliveries.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AccessTokenPayload, @Query('contractId') contractId?: string) {
    if (!contractId) {
      throw new BadRequestException('O parâmetro contractId é obrigatório.');
    }
    return this.deliveries.listByContract(user, contractId);
  }

  @Roles('admin', 'operator')
  @Post(':id/quality-report')
  addReport(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(qualityReportSchema)) dto: QualityReportDto,
  ) {
    return this.deliveries.addQualityReport(user, id, dto);
  }

  @Get(':id/quality-report')
  getReport(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.deliveries.getQualityReport(user, id);
  }

  @Roles('admin', 'operator')
  @Post(':id/release-payment')
  release(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.deliveries.releasePayment(user, id);
  }
}
