import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators';
import { TokenService, AccessTokenPayload } from './token.service';
import { TENANT_CONTEXT_KEY, TenantContext } from '../prisma/tenant-context';

/**
 * Guard global de autenticação. Verifica o Bearer access token, anexa o usuário
 * ao request e popula o contexto de tenant no CLS (consumido pelo RLS do Prisma).
 * Rotas marcadas com @Public() são liberadas.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }

    request.user = payload;
    const ctx: TenantContext = {
      orgId: payload.orgId,
      tenantId: payload.tenantId,
      userId: payload.sub,
      role: payload.role,
    };
    this.cls.set(TENANT_CONTEXT_KEY, ctx);
    return true;
  }

  private extractBearer(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : undefined;
  }
}
