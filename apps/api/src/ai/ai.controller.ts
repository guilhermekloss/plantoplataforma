import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AiService } from "./ai.service";
import { assistantMessageSchema, type AssistantMessageDto } from "./dto/ai.schemas";
import type { TenantContext } from "../common/cls/tenant-context";

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("contracts/:id/explain")
  explain(@Param("id") id: string, @CurrentUser() user: TenantContext) {
    return this.ai.explainContract(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles("PRODUCER")
  @Post("assistant")
  chat(@Body(new ZodValidationPipe(assistantMessageSchema)) dto: AssistantMessageDto, @CurrentUser() user: TenantContext) {
    return this.ai.chat(user.tenantId, dto.message);
  }

  @UseGuards(RolesGuard)
  @Roles("PRODUCER")
  @Post("suggest-contracts")
  suggestContracts(@CurrentUser() user: TenantContext) {
    return this.ai.suggestContracts(user.tenantId);
  }
}
