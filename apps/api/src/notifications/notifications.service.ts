import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { contractDeadlineWarningEmail } from '../email/templates';

const DAY = 24 * 3600 * 1000;
// Não avisa rascunhos (não são compromisso) nem contratos já encerrados.
const SKIP_STATUSES = ['rascunho', 'liquidado', 'cancelado'] as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Roda diariamente às 8h: avisa a cooperativa quando a entrega cruza a marca de 30 dias. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDeadlineWarnings(): Promise<void> {
    const count = await this.notifyUpcomingDeadlines();
    if (count > 0) {
      this.logger.log(`Avisos de prazo (30 dias) enviados: ${count}`);
    }
  }

  /**
   * Envia o aviso para contratos cujo deadline está na janela (29, 30] dias —
   * garante que cada contrato seja notificado uma única vez, sem coluna extra.
   * Retorna a quantidade de avisos enviados.
   */
  async notifyUpcomingDeadlines(now: Date = new Date()): Promise<number> {
    const windowStart = new Date(now.getTime() + 29 * DAY);
    const windowEnd = new Date(now.getTime() + 30 * DAY);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { notIn: [...SKIP_STATUSES] },
        deliveryDeadline: { gt: windowStart, lte: windowEnd },
      },
      include: { buyer: { select: { email: true } } },
    });

    for (const contract of contracts) {
      const { subject, html } = contractDeadlineWarningEmail({
        contractNumber: contract.contractNumber,
        deliveryDate: contract.deliveryDeadline.toLocaleDateString('pt-BR'),
      });
      try {
        await this.email.send({ to: contract.buyer.email, subject, html });
      } catch (err) {
        this.logger.error(
          `Falha ao avisar prazo do contrato ${contract.contractNumber}`,
          err instanceof Error ? err.message : '',
        );
      }
    }
    return contracts.length;
  }
}
