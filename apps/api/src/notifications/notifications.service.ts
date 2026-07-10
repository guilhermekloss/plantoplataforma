import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

export const DEADLINE_WARNING_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkUpcomingDeadlines(): Promise<number> {
    const windowEnd = new Date(Date.now() + DEADLINE_WARNING_DAYS * ONE_DAY_MS);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ["ASSINADO", "ENTREGA_PARCIAL"] },
        deliveryDeadline: { lte: windowEnd },
        deadlineWarningSentAt: null,
      },
      include: {
        buyerOrg: { include: { users: true } },
        sellerOrg: { include: { users: true } },
      },
    });

    for (const contract of contracts) {
      const users = [...contract.buyerOrg.users, ...contract.sellerOrg.users];
      const deadline = contract.deliveryDeadline.toLocaleDateString("pt-BR");
      await Promise.all(
        users.map((u) =>
          this.email.send({
            to: u.email,
            subject: `Prazo de entrega se aproxima — contrato ${contract.number}`,
            html: `<p>O contrato <strong>${contract.number}</strong> tem entrega prevista para <strong>${deadline}</strong> (dentro de ${DEADLINE_WARNING_DAYS} dias).</p>`,
          }),
        ),
      );
      await this.prisma.contract.update({
        where: { id: contract.id },
        data: { deadlineWarningSentAt: new Date() },
      });
    }

    this.logger.log(`Aviso de prazo enviado para ${contracts.length} contrato(s)`);
    return contracts.length;
  }
}
