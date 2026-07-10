import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { OffersService } from "./offers.service";
import {
  createOfferSchema,
  generateContractSchema,
  type CreateOfferDto,
  type GenerateContractDto,
} from "./dto/offer.schemas";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("offers")
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Roles("PRODUCER")
  @Post()
  create(@Body(new ZodValidationPipe(createOfferSchema)) dto: CreateOfferDto, @CurrentUser() user: TenantContext) {
    return this.offers.create(dto, user.tenantId);
  }

  @Roles("PRODUCER")
  @Get("mine")
  mine(@CurrentUser() user: TenantContext) {
    return this.offers.listMine(user.tenantId);
  }

  @Roles("ADMIN", "OPERATOR")
  @Get("market")
  market() {
    return this.offers.listMarket();
  }

  @Roles("ADMIN", "OPERATOR")
  @Post(":id/generate-contract")
  generateContract(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(generateContractSchema)) dto: GenerateContractDto,
    @CurrentUser() user: TenantContext,
  ) {
    return this.offers.generateContract(id, user.tenantId, user.userId, dto);
  }
}
