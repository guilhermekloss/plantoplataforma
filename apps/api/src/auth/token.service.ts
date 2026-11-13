import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Env } from '../config/env.schema';

export interface AccessTokenPayload {
  sub: string; // userId
  orgId: string;
  tenantId: string;
  role: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string; // userId
  type: 'refresh';
}

export interface InviteTokenPayload {
  email: string;
  inviterOrgId: string;
  inviterName: string;
  role: 'producer';
  type: 'invite';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: 'access' },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
      },
    );
  }

  async signRefreshToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
      },
    );
  }

  async signInviteToken(payload: Omit<InviteTokenPayload, 'type' | 'role'>): Promise<string> {
    const ttlHours = this.config.get('INVITE_TOKEN_TTL_HOURS', { infer: true });
    return this.jwt.signAsync(
      { ...payload, role: 'producer', type: 'invite' },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: `${ttlHours}h`,
      },
    );
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.verify<AccessTokenPayload>(token, this.config.get('JWT_ACCESS_SECRET', { infer: true }), 'access');
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.verify<RefreshTokenPayload>(
      token,
      this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      'refresh',
    );
  }

  /**
   * Verifica o token de convite. Lança erro CLARO e específico quando expirado
   * (não genérico) — requisito do Módulo 1.
   */
  async verifyInviteToken(token: string): Promise<InviteTokenPayload> {
    try {
      return await this.verify<InviteTokenPayload>(
        token,
        this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        'invite',
      );
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('Este convite expirou. Peça um novo convite à cooperativa.');
      }
      throw new UnauthorizedException('Convite inválido.');
    }
  }

  private async verify<T extends { type: string }>(
    token: string,
    secret: string,
    expectedType: T['type'],
  ): Promise<T> {
    const payload = await this.jwt.verifyAsync<T>(token, { secret });
    if (payload.type !== expectedType) {
      throw new UnauthorizedException('Token de tipo inesperado.');
    }
    return payload;
  }
}
