import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  acceptInviteSchema,
  issueInviteSchema,
  loginSchema,
  type AcceptInviteDto,
  type IssueInviteDto,
  type LoginDto,
} from "./dto/auth.schemas";
import type { TenantContext } from "../common/cls/tenant-context";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("invite")
  async issueInvite(
    @Body(new ZodValidationPipe(issueInviteSchema)) dto: IssueInviteDto,
    @CurrentUser() user: TenantContext,
  ) {
    await this.auth.issueInvite(dto.email, user.tenantId, user.name);
    return { status: "enviado" };
  }

  @Post("invite/accept")
  acceptInvite(@Body(new ZodValidationPipe(acceptInviteSchema)) dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto);
  }
}
