import { Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

/** Endpoint dev-only para testar o aviso de prazo sem esperar o cron diário. */
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post("trigger-deadline-check")
  async trigger() {
    const count = await this.notifications.checkUpcomingDeadlines();
    return { notified: count };
  }
}
