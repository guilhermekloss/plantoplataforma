import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";

export interface InvitePayload {
  email: string;
  inviterOrgId: string;
  inviterName: string;
}

const INVITE_TTL = "24h";

/**
 * Convite = JWT stateless assinado (TTL 24h), SEM tabela `Invite` no banco
 * — decisão para não alterar o schema sem necessidade. O link de convite
 * carrega tudo que precisa no próprio token.
 */
@Injectable()
export class InviteService {
  constructor(private readonly config: ConfigService) {}

  issue(payload: InvitePayload): string {
    const secret = this.config.get<string>("INVITE_JWT_SECRET")!;
    return jwt.sign(payload, secret, { expiresIn: INVITE_TTL });
  }

  verify(token: string): InvitePayload {
    const secret = this.config.get<string>("INVITE_JWT_SECRET")!;
    try {
      return jwt.verify(token, secret) as InvitePayload;
    } catch {
      throw new UnauthorizedException("Convite inválido ou expirado");
    }
  }
}
