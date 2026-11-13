import { Body, Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AccessTokenPayload } from '../auth/token.service';
import { AiService } from './ai.service';
import { assistantSchema, type AssistantDto } from './ai.dto';

// IA é mais cara/lenta — limite mais apertado que o global.
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('contracts/:id/explain')
  explain(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.ai.explainContract(user, id);
  }

  @Post('assistant')
  assistant(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(assistantSchema)) dto: AssistantDto,
  ) {
    return this.ai.assistant(user, dto.message, dto.history ?? []);
  }

  // Agente que propõe ofertas/contratos a partir dos lotes aptos do produtor.
  @Post('suggest-contracts')
  suggest(@CurrentUser() user: AccessTokenPayload) {
    return this.ai.suggestContracts(user);
  }

  // Cooperativa: a qualidade do lote justifica o preço pedido na oferta?
  @Roles('admin', 'operator')
  @Post('offers/:id/evaluate')
  evaluateOffer(@Param('id') id: string) {
    return this.ai.evaluateOffer(id);
  }
}
