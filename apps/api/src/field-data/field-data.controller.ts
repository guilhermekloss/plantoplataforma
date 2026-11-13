import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import type { GrainType } from '@plantor/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AccessTokenPayload } from '../auth/token.service';
import { FieldDataService } from './field-data.service';
import {
  harvestEventSchema,
  targetPriceSchema,
  type HarvestEventDto,
  type TargetPriceDto,
} from './field-data.dto';

@Controller('field-data')
export class FieldDataController {
  constructor(private readonly fieldData: FieldDataService) {}

  @Get('overview')
  overview(@CurrentUser() user: AccessTokenPayload) {
    return this.fieldData.overview(user);
  }

  // Webhook de colheita (formato da OEM — na Fase 03 chega via integração real).
  @Roles('producer')
  @Post('events/harvest')
  harvestEvent(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(harvestEventSchema)) dto: HarvestEventDto,
  ) {
    return this.fieldData.ingestHarvestEvent(user, dto);
  }

  // Botão "Simular colheita" (dev/demo): gera e ingere o evento da OEM.
  @Roles('producer')
  @Post('events/harvest/simulate')
  simulateHarvest(@CurrentUser() user: AccessTokenPayload, @Query('grain') grain?: string) {
    return this.fieldData.simulateHarvest(user, grain as GrainType | undefined);
  }

  @Roles('producer')
  @Patch('target-price')
  setTargetPrice(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(targetPriceSchema)) dto: TargetPriceDto,
  ) {
    return this.fieldData.setTargetPrice(user, dto);
  }
}
