import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sem RESEND_API_KEY (dev sem chave configurada), degrada para log no
 * console em vez de falhar — mesmo padrão de degradação graciosa usado
 * depois no AiModule.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[email desativado, sem RESEND_API_KEY] Para: ${input.to} | Assunto: ${input.subject}`);
      return;
    }
    await this.resend.emails.send({
      from: "Plantor <contato@plantor.app>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
