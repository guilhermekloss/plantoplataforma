import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Public, Roles } from './decorators';
import { AuthService } from './auth.service';
import type { AccessTokenPayload } from './token.service';
import {
  acceptInviteSchema,
  inviteSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  type AcceptInviteDto,
  type InviteDto,
  type LoginDto,
  type RefreshDto,
  type RegisterDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // Apenas cooperativa/trading (admin|operator) podem convidar produtores.
  @Roles('admin', 'operator')
  @HttpCode(200)
  @Post('invite')
  invite(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(inviteSchema)) dto: InviteDto,
  ) {
    return this.authService.invite(user, dto);
  }

  @Public()
  @Post('accept-invite/:token')
  acceptInvite(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(acceptInviteSchema)) dto: AcceptInviteDto,
  ) {
    return this.authService.acceptInvite(token, dto);
  }
}
