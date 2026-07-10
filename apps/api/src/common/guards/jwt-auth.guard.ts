import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ClsService } from "nestjs-cls";
import type { UserRole } from "@plantor/shared";
import { setTenantContext } from "../cls/tenant-context";

export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  role: UserRole;
  name: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente");
    }

    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token);
      setTenantContext(this.cls, {
        tenantId: payload.tenantId,
        userId: payload.sub,
        role: payload.role,
        name: payload.name,
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token de acesso inválido ou expirado");
    }
  }
}
