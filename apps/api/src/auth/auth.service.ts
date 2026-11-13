import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import type { Organization, User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Env } from '../config/env.schema';
import { EmailService } from '../email/email.service';
import { inviteEmail } from '../email/templates';
import { PasswordService } from './password.service';
import { TokenService, AccessTokenPayload } from './token.service';
import type { AcceptInviteDto, InviteDto, LoginDto, RegisterDto } from './auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
    organizationType: string;
  };
}

/** Mapeia tipo de org → papel inicial do primeiro usuário. */
function initialRole(orgType: RegisterDto['type']): 'admin' | 'producer' {
  return orgType === 'producer' ? 'producer' : 'admin';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.password.hash(dto.password);
    const orgId = createId();
    const role = initialRole(dto.type);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role,
          organization: {
            create: {
              id: orgId,
              tenantId: orgId, // tenantId == id no MVP
              type: dto.type,
              name: dto.name,
              email: dto.email,
            },
          },
        },
        include: { organization: true },
      });
      return this.issueResult(user, user.organization);
    } catch (err) {
      throw this.mapUniqueError(err, 'Já existe uma conta com este email.');
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }
    const ok = await this.password.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueResult(user, user.organization);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let userId: string;
    try {
      const payload = await this.tokens.verifyRefreshToken(refreshToken);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo.');
    }
    const result = await this.issueResult(user, user.organization);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  /** Cooperativa/trading convida um produtor por email (magic link TTL 24h). */
  async invite(inviter: AccessTokenPayload, dto: InviteDto): Promise<{ sent: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este email.');
    }
    const inviterOrg = await this.prisma.organization.findUnique({
      where: { id: inviter.orgId },
      select: { name: true },
    });
    const inviterName = inviterOrg?.name ?? inviter.email;
    const token = await this.tokens.signInviteToken({
      email: dto.email,
      inviterOrgId: inviter.orgId,
      inviterName,
    });
    const acceptUrl = `${this.config.get('APP_WEB_URL', { infer: true })}/invite/${token}`;
    const { subject, html } = inviteEmail({ inviterName, acceptUrl });
    await this.email.send({ to: dto.email, subject, html });
    return { sent: true };
  }

  /** Produtor aceita o convite, define senha e ganha acesso (auto-login). */
  async acceptInvite(token: string, dto: AcceptInviteDto): Promise<AuthResult> {
    const invite = await this.tokens.verifyInviteToken(token);
    const existing = await this.prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) {
      throw new ConflictException('Este convite já foi utilizado.');
    }
    const passwordHash = await this.password.hash(dto.password);
    const orgId = createId();
    try {
      const user = await this.prisma.user.create({
        data: {
          email: invite.email,
          passwordHash,
          name: dto.name,
          role: 'producer',
          organization: {
            create: {
              id: orgId,
              tenantId: orgId,
              type: 'producer',
              name: dto.name,
              email: invite.email,
            },
          },
        },
        include: { organization: true },
      });
      return this.issueResult(user, user.organization);
    } catch (err) {
      throw this.mapUniqueError(err, 'Este convite já foi utilizado.');
    }
  }

  private async issueResult(user: User, org: Organization): Promise<AuthResult> {
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      orgId: org.id,
      tenantId: org.tenantId,
      role: user.role,
      email: user.email,
    });
    const refreshToken = await this.tokens.signRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: org.id,
        organizationType: org.type,
      },
    };
  }

  private mapUniqueError(err: unknown, message: string): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException(message);
    }
    this.logger.error('Erro inesperado no AuthService', err instanceof Error ? err.stack : undefined);
    return err instanceof Error ? err : new Error('Erro desconhecido.');
  }
}
