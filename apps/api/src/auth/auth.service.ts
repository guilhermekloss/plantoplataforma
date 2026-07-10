import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "./password.service";
import { InviteService } from "./invite.service";
import { EmailService } from "../email/email.service";
import { inviteEmailHtml } from "../email/templates/invite";
import type { AcceptInviteDto, LoginDto } from "./dto/auth.schemas";

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
    organizationName: string;
    organizationType: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly jwt: JwtService,
    private readonly invite: InviteService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });
    if (!user) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const passwordMatches = await this.password.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    return this.buildAuthResult(user, user.organization);
  }

  async issueInvite(email: string, inviterOrgId: string, inviterName: string): Promise<void> {
    const inviterOrg = await this.prisma.organization.findUniqueOrThrow({ where: { id: inviterOrgId } });
    const token = this.invite.issue({ email, inviterOrgId, inviterName });
    const acceptUrl = `${this.config.get<string>("APP_URL")}/invite/${token}`;

    await this.email.send({
      to: email,
      subject: `${inviterName} te convidou para a Plantor`,
      html: inviteEmailHtml({ inviterName, inviterOrgName: inviterOrg.name, acceptUrl }),
    });
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<AuthResult> {
    const payload = this.invite.verify(dto.token);

    const existing = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new UnauthorizedException("Já existe uma conta com este e-mail");
    }

    const passwordHash = await this.password.hash(dto.password);

    const organization = dto.newOrganization
      ? await this.prisma.organization.create({
          data: { name: dto.newOrganization.name, type: dto.newOrganization.type },
        })
      : await this.prisma.organization.findUniqueOrThrow({ where: { id: payload.inviterOrgId } });

    // Primeiro usuário de uma org nova entra como ADMIN; quem entra numa
    // org existente (convite de colega) entra como OPERATOR. Produtor
    // pessoa física normalmente vem com newOrganization (tipo PRODUCER).
    const role = dto.newOrganization
      ? organization.type === "PRODUCER"
        ? "PRODUCER"
        : "ADMIN"
      : "OPERATOR";

    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        name: dto.name,
        passwordHash,
        role,
        organizationId: organization.id,
      },
    });

    return this.buildAuthResult(user, organization);
  }

  private buildAuthResult(
    user: { id: string; name: string; email: string; role: string; organizationId: string },
    organization: { id: string; name: string; type: string },
  ): AuthResult {
    const accessToken = this.jwt.sign({
      sub: user.id,
      tenantId: user.organizationId,
      role: user.role,
      name: user.name,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationType: organization.type,
      },
    };
  }
}
