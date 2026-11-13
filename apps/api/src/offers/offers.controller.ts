import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AccessTokenPayload } from '../auth/token.service';
import { OffersService } from './offers.service';
import { createOfferSchema, type CreateOfferDto } from './offers.dto';

@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  // Produtor disponibiliza um lote para venda.
  @Roles('producer')
  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createOfferSchema)) dto: CreateOfferDto,
  ) {
    return this.offers.create(user, dto);
  }

  @Roles('producer')
  @Get('mine')
  mine(@CurrentUser() user: AccessTokenPayload) {
    return this.offers.mine(user);
  }

  // Mercado para cooperativas/tradings.
  @Roles('admin', 'operator')
  @Get('marketplace')
  marketplace() {
    return this.offers.marketplace();
  }

  // Dossiê de rastreabilidade do lote da oferta (comprador avalia antes de aceitar).
  @Roles('admin', 'operator')
  @Get(':id/traceability')
  traceability(@Param('id') id: string) {
    return this.offers.traceability(id);
  }

  // Dossiê acessado a partir do contrato gerado pela oferta (pós-compra).
  @Roles('admin', 'operator')
  @Get('by-contract/:contractId/traceability')
  traceabilityByContract(@Param('contractId') contractId: string) {
    return this.offers.traceabilityByContract(contractId);
  }

  @Roles('admin', 'operator')
  @Post(':id/accept')
  accept(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.offers.accept(user, id);
  }
}
