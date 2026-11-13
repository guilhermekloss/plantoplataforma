import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Env } from '../config/env.schema';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envio de email transacional via Resend.
 * Sem RESEND_API_KEY (dev), o email é apenas logado — nunca falha o fluxo.
 * LGPD: não logamos o corpo (pode conter dados pessoais), só o destinatário.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    this.from = this.config.get('EMAIL_FROM', { infer: true });
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async send({ to, subject, html }: SendEmailInput): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[DEV] Email não enviado (sem RESEND_API_KEY). Destinatário: ${to} | Assunto: ${subject}`);
      return;
    }
    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Falha ao enviar email para ${to}: ${error.name}`);
      throw new Error('Falha ao enviar email.');
    }
  }
}
